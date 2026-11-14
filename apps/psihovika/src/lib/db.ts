import { pendingMigrations } from "../../scripts/migration-plan.mjs";
import { isCloudflareWorker } from "./env.server";

/** Which database backend is active. */
export type DbSource = "neon" | "pglite";

// An empty/whitespace DATABASE_URL (an easy misconfig in deploy UIs) must mean
// "unset" — otherwise production would silently run on the PGLite fallback.
// `PSY_DATABASE_URL` is an alias for Workers/GitHub secrets when the generic
// name is reserved by another host.
function readDatabaseUrl(): string | undefined {
  if (typeof process === "undefined") return undefined;
  for (const key of ["DATABASE_URL", "PSY_DATABASE_URL"] as const) {
    const raw = process.env[key];
    if (raw && raw.trim()) return raw.trim();
  }
  return undefined;
}
const databaseUrl = readDatabaseUrl();

/**
 * Active backend: real **Neon** when `DATABASE_URL` is set (deployed / configured
 * sandbox), otherwise a local embedded **PGLite** (Postgres compiled to WASM) so
 * the app has a working database even with nothing configured — the live preview
 * included. Swap in Neon later by just setting `DATABASE_URL`; no code changes.
 */
export const dbSource: DbSource = databaseUrl ? "neon" : "pglite";

/**
 * Minimal shared SQL surface, satisfied by both Neon and PGLite. Both the
 * tagged-template and `.query()` forms resolve to an array of row objects:
 *
 *   const sql = await getSql();
 *   const rows = await sql`select * from todos where id = ${id}`; // parameterized
 *   const rows2 = await sql.query("select * from todos where id = $1", [id]);
 */
export interface Sql {
  <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]>;
  query<T = Record<string, unknown>>(
    text: string,
    params?: unknown[],
  ): Promise<T[]>;
}

/**
 * Init state lives on globalThis as promises: dev HMR creates new instances of
 * this module, and two instances racing module-level state would open a second
 * pool or run two concurrent PGLite migration passes (whose duplicate
 * `_migrations` insert rejects — and would get memoized, poisoning every later
 * `getSql()`). A failed init clears its slot so the next call retries.
 */
const globalRef = globalThis as typeof globalThis & {
  __pgSqlPromise__?: Promise<Sql>;
  __pgliteInstance__?: Promise<import("@electric-sql/pglite").PGlite>;
  __pgliteMigrateChain__?: Promise<void>;
};

/**
 * Result-type parity: Postgres sends every value as text plus a type OID — the
 * JS value is the DRIVER's parsing choice, and pg and PGLite disagree (pg:
 * int8 -> string, date -> local-midnight Date; PGLite: int8 -> BigInt, which
 * JSON.stringify rejects, date -> UTC Date). Normalize both so preview and
 * production return identical, JSON-safe shapes:
 *   int8/bigint (incl. count(*)) -> number (past 2^53 loses precision — cast
 *                                   `::text` if you ever need huge integers)
 *   date                         -> 'YYYY-MM-DD' string
 *   interval                     -> Postgres interval text
 * numeric already comes back as a string on both (arbitrary precision).
 */
const OID_INT8 = 20;
const OID_DATE = 1082;
const OID_INTERVAL = 1186;
const identity = (v: string) => v;

type Run = <T>(text: string, params: unknown[]) => Promise<T[]>;

/** Wrap a query runner in the tagged-template + `.query()` `Sql` surface. */
function toSql(run: Run): Sql {
  const sql = (async <T = Record<string, unknown>>(
    strings: TemplateStringsArray,
    ...values: unknown[]
  ): Promise<T[]> => {
    // Rebuild with $1, $2, … placeholders so values stay parameterized.
    let text = strings[0];
    for (let i = 0; i < values.length; i += 1) text += `$${i + 1}${strings[i + 1]}`;
    return run<T>(text, values);
  }) as unknown as Sql;
  sql.query = <T = Record<string, unknown>>(text: string, params: unknown[] = []) =>
    run<T>(text, params);
  return sql;
}

/**
 * Neon via node-postgres (`pg`).
 *
 * - Node (local dev, tests): one Pool per process, reused across requests.
 * - Cloudflare Workers: a socket belongs to the request that opened it. A pooled connection reused by the
 *   next request hangs until the runtime cancels that request ("Worker threw exception" on every other
 *   request). So on Workers each query opens and closes its own short-lived Client. Migrations still run
 *   once per isolate.
 */
type PgModule = typeof import("pg");

async function loadPg(): Promise<PgModule> {
  const pg = await import("pg");
  pg.types.setTypeParser(OID_INT8, Number);
  pg.types.setTypeParser(OID_DATE, identity);
  pg.types.setTypeParser(OID_INTERVAL, identity);
  return pg;
}

type PgQueryable = {
  query<T>(text: string, params?: unknown[]): Promise<{ rows: T[] }>;
};

async function applyMigrations(conn: PgQueryable): Promise<void> {
  await conn.query(
    "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const migrations = import.meta.glob("/migrations/*.sql", {
    query: "?raw",
    import: "default",
    eager: true,
  }) as Record<string, string>;
  const applied = (await conn.query<{ name: string }>("select name from _migrations")).rows.map(
    (r) => r.name,
  );
  for (const { name, path } of pendingMigrations(Object.keys(migrations), applied)) {
    try {
      await conn.query("begin");
      await conn.query(migrations[path]);
      await conn.query("insert into _migrations (name) values ($1)", [name]);
      await conn.query("commit");
    } catch (err) {
      try {
        await conn.query("rollback");
      } catch {
        // keep the original error
      }
      throw err;
    }
  }
}

function createNeonSql(): Promise<Sql> {
  globalRef.__pgSqlPromise__ ??= (async () => {
    const pg = await loadPg();

    if (isCloudflareWorker()) {
      const withClient = async <R>(fn: (c: InstanceType<PgModule["Client"]>) => Promise<R>): Promise<R> => {
        const client = new pg.Client({ connectionString: databaseUrl });
        await client.connect();
        try {
          return await fn(client);
        } finally {
          await client.end().catch(() => {});
        }
      };
      await withClient((c) => applyMigrations(c as unknown as PgQueryable));
      return toSql(async <T>(text: string, params: unknown[]) =>
        withClient(async (c) => (await c.query(text, params)).rows as T[]),
      );
    }

    const pool = new pg.Pool({ connectionString: databaseUrl });
    const client = await pool.connect();
    try {
      await applyMigrations(client as unknown as PgQueryable);
    } finally {
      client.release();
    }
    return toSql(async <T>(text: string, params: unknown[]) => {
      const res = await pool.query(text, params);
      return res.rows as T[];
    });
  })().catch((err) => {
    globalRef.__pgSqlPromise__ = undefined;
    throw err;
  });
  return globalRef.__pgSqlPromise__;
}

async function createPgliteSql(): Promise<Sql> {
  // Embedded Postgres, imported on demand so it never loads on the Neon path.
  // One in-memory instance per process, shared across HMR module instances, so
  // data survives source edits (it resets on dev-server restart).
  globalRef.__pgliteInstance__ ??= (async () => {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite({
      parsers: {
        [OID_INT8]: Number,
        [OID_DATE]: identity,
        [OID_INTERVAL]: identity,
      },
    });
    await pg.waitReady;
    await pg.exec(
      "create table if not exists _migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    return pg;
  })().catch((err) => {
    globalRef.__pgliteInstance__ = undefined;
    throw err;
  });
  const pg = await globalRef.__pgliteInstance__;

  // Apply migrations/ (the single schema source) so preview matches production.
  // SQL is inlined by the bundler via import.meta.glob (no runtime fs); applied
  // files are tracked in _migrations. The glob does not descend, so the opt-in
  // auth schema under migrations/auth/ stays out. Runs once per module instance
  // — so an HMR reload after adding a migration file applies it live — with
  // passes serialized on a global chain so concurrent callers never
  // double-apply.
  const migrate = async (): Promise<void> => {
    const migrations = import.meta.glob("/migrations/*.sql", {
      query: "?raw",
      import: "default",
      eager: true,
    }) as Record<string, string>;
    const doneRows = await pg.query<{ name: string }>(
      "select name from _migrations",
    );
    const done = doneRows.rows.map((r) => r.name);
    for (const { name, path } of pendingMigrations(Object.keys(migrations), done)) {
      // Apply + record atomically (parity with scripts/migrate.mjs) so a failed
      // statement can't leave a file half-applied but untracked.
      await pg.transaction(async (tx) => {
        await tx.exec(migrations[path]);
        await tx.query("insert into _migrations (name) values ($1)", [name]);
      });
    }
  };
  const pass = (globalRef.__pgliteMigrateChain__ ?? Promise.resolve())
    .catch(() => undefined) // an earlier failed pass must not wedge the chain
    .then(migrate);
  globalRef.__pgliteMigrateChain__ = pass;
  await pass;

  return toSql(async <T>(text: string, params: unknown[]) => {
    const result = await pg.query<T>(text, params);
    return result.rows;
  });
}

let sqlPromise: Promise<Sql> | null = null;

async function createSql(): Promise<Sql> {
  if (typeof window !== "undefined") {
    throw new Error(
      "@/lib/db is server-only — call getSql() from a createServerFn handler " +
        "or a server route loader, never from client code.",
    );
  }
  if (dbSource === "neon") return createNeonSql();
  if (isCloudflareWorker()) {
    throw new Error(
      "На Cloudflare Workers нужен Neon DATABASE_URL (wrangler secret put DATABASE_URL). " +
        "PGLite в Worker не запускается.",
    );
  }
  return createPgliteSql();
}

/**
 * Get the shared, **server-only** SQL client. Neon when `DATABASE_URL` is set,
 * otherwise the local PGLite fallback. Memoized — safe to call per request.
 *
 * Schema comes from `migrations/*.sql`, auto-applied before the first query on
 * both backends — define tables there, never inline in server functions.
 */
export function getSql(): Promise<Sql> {
  sqlPromise ??= createSql().catch((err) => {
    sqlPromise = null; // don't memoize failures — let the next call retry
    throw err;
  });
  return sqlPromise;
}

/**
 * The shared PGLite instance (preview only), with `migrations/*.sql` applied.
 * Lets Better Auth persist to the SAME embedded DB as app data in preview (via a
 * Kysely dialect). Throws when `DATABASE_URL` is set (that path uses Neon).
 */
export async function getPglite(): Promise<import("@electric-sql/pglite").PGlite> {
  if (dbSource !== "pglite") {
    throw new Error("getPglite() is only available on the PGLite fallback (no DATABASE_URL)");
  }
  await getSql();
  const pg = await globalRef.__pgliteInstance__;
  if (!pg) throw new Error("PGLite instance failed to initialize");
  return pg;
}

/**
 * Finish DB bootstrap before the server handles traffic.
 *
 * - **PGLite** (preview / no `DATABASE_URL`): open the in-memory DB and apply
 *   `migrations/*.sql`. Idempotent — concurrent callers share one promise.
 * - **Neon** (`DATABASE_URL` / `PSY_DATABASE_URL`): same — open the pool and
 *   apply pending migrations before auth or CMS touch the schema. Required
 *   because Better Auth uses its own `pg` Pool and does not call `getSql()`.
 * - **Workers without Neon**: no-op (memory auth; PGLite unsupported).
 *
 * Vite `configureServer` awaits this at dev startup; production imports of this
 * module kick it off immediately on the PGLite path (see bottom of file). On
 * Neon/Workers, callers must `await ensureDbReady()` on the request path.
 */
export function ensureDbReady(): Promise<void> {
  if (dbSource === "neon") {
    return getSql().then(() => undefined);
  }
  // Workers without Neon have no PGLite — treat as ready so auth/module boot
  // does not reject via createSql()'s Worker guard.
  if (dbSource !== "pglite" || isCloudflareWorker()) {
    return Promise.resolve();
  }
  return getSql().then(() => undefined);
}

// Server-only eager start: kick PGLite bootstrap as soon as this module loads in
// Node. Client bundles never hit this path (`getSql` throws in the browser).
// Workers skip this — crypto/I/O at global scope is disallowed, and PGLite is
// unsupported there (use Neon via DATABASE_URL).
const globalBoot = globalThis as typeof globalThis & {
  __pgBootstrapPromise__?: Promise<void>;
};
if (typeof window === "undefined" && dbSource === "pglite" && !isCloudflareWorker()) {
  globalBoot.__pgBootstrapPromise__ ??= ensureDbReady().catch((err) => {
    globalBoot.__pgBootstrapPromise__ = undefined;
    console.error("[db] PGLite bootstrap failed:", err);
    throw err;
  });
}
