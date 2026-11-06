import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/lib/auth/middleware";
import { applyContentOverride } from "@/lib/cms/content";
import type { ContentOverride, MethodPatch, TeamNote, TeamRow } from "@/lib/cms/types";
import { TESTS, getTest } from "@/data/catalog";
import type { Test } from "@/data/build";
import { BRAND } from "@/lib/brand";

function newId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function inviteCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 8; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}

async function sql() {
  const { getSql } = await import("@/lib/db");
  return getSql();
}

async function requireMembership(userId: string, teamId: string, write = false) {
  const db = await sql();
  const rows = await db<TeamRow>`
    select t.id, t.name, t.invite_code, m.role
    from teams t
    join team_members m on m.team_id = t.id
    where t.id = ${teamId} and m.user_id = ${userId}
    limit 1
  `;
  const team = rows[0];
  if (!team) throw new Error("Нет доступа к этой команде.");
  if (write && team.role === "viewer") throw new Error("Только просмотр: прав на правку нет.");
  return team;
}

export const listMyTeams = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await sql();
    return db<TeamRow>`
      select t.id, t.name, t.invite_code, m.role
      from teams t
      join team_members m on m.team_id = t.id
      where m.user_id = ${context.userId}
      order by t.created_at desc
    `;
  });

export const createTeam = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { name: string }) => {
    const name = data.name?.trim() ?? "";
    if (name.length < 2) throw new Error("Название команды слишком короткое.");
    return { name };
  })
  .handler(async ({ context, data }) => {
    const db = await sql();
    const id = newId("team");
    const code = inviteCode();
    await db`
      insert into teams (id, name, invite_code, created_by)
      values (${id}, ${data.name}, ${code}, ${context.userId})
    `;
    await db`
      insert into team_members (team_id, user_id, role)
      values (${id}, ${context.userId}, ${"owner"})
    `;
    return { id, name: data.name, invite_code: code, role: "owner" as const };
  });

export const joinTeam = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { code: string }) => {
    const code = data.code?.trim().toUpperCase() ?? "";
    if (code.length < 4) throw new Error("Введите код приглашения.");
    return { code };
  })
  .handler(async ({ context, data }) => {
    const db = await sql();
    const found = await db<{ id: string; name: string; invite_code: string }>`
      select id, name, invite_code from teams where invite_code = ${data.code} limit 1
    `;
    const team = found[0];
    if (!team) throw new Error("Команда с таким кодом не найдена.");
    await db`
      insert into team_members (team_id, user_id, role)
      values (${team.id}, ${context.userId}, ${"editor"})
      on conflict (team_id, user_id) do nothing
    `;
    return { id: team.id, name: team.name, invite_code: team.invite_code, role: "editor" as const };
  });

export const listOverrides = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { teamId: string }) => {
    if (!data.teamId) throw new Error("Нужна команда.");
    return data;
  })
  .handler(async ({ context, data }) => {
    await requireMembership(context.userId, data.teamId);
    const db = await sql();
    return db<ContentOverride>`
      select id, team_id, method_id, title, lead, source, warn, notes, updated_by, updated_at::text as updated_at
      from content_overrides
      where team_id = ${data.teamId}
      order by updated_at desc
    `;
  });

export const saveOverride = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { teamId: string; patch: MethodPatch }) => {
    if (!data.teamId || !data.patch?.methodId) throw new Error("Нужны команда и методика.");
    return data;
  })
  .handler(async ({ context, data }) => {
    await requireMembership(context.userId, data.teamId, true);
    const db = await sql();
    const id = newId("ov");
    const p = data.patch;
    await db`
      insert into content_overrides (id, team_id, method_id, title, lead, source, warn, notes, updated_by)
      values (
        ${id},
        ${data.teamId},
        ${p.methodId},
        ${p.title ?? null},
        ${p.lead ?? null},
        ${p.source ?? null},
        ${p.warn ?? null},
        ${p.notes ?? null},
        ${context.userId}
      )
      on conflict (team_id, method_id) do update set
        title = excluded.title,
        lead = excluded.lead,
        source = excluded.source,
        warn = excluded.warn,
        notes = excluded.notes,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `;
    return { ok: true as const };
  });

export const listNotes = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { teamId: string; methodId?: string }) => data)
  .handler(async ({ context, data }) => {
    await requireMembership(context.userId, data.teamId);
    const db = await sql();
    if (data.methodId) {
      return db<TeamNote>`
        select id, team_id, method_id, body, author_id, author_name, created_at::text as created_at
        from team_notes
        where team_id = ${data.teamId} and method_id = ${data.methodId}
        order by created_at desc
        limit 40
      `;
    }
    return db<TeamNote>`
      select id, team_id, method_id, body, author_id, author_name, created_at::text as created_at
      from team_notes
      where team_id = ${data.teamId}
      order by created_at desc
      limit 40
    `;
  });

export const addNote = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { teamId: string; body: string; methodId?: string }) => {
    const body = data.body?.trim() ?? "";
    if (!data.teamId || body.length < 1) throw new Error("Пустая заметка.");
    return { teamId: data.teamId, body, methodId: data.methodId };
  })
  .handler(async ({ context, data }) => {
    await requireMembership(context.userId, data.teamId, true);
    const db = await sql();
    const id = newId("note");
    const authors = await db<{ name: string }>`
      select name from "user" where id = ${context.userId} limit 1
    `;
    const authorName = authors[0]?.name ?? null;
    await db`
      insert into team_notes (id, team_id, method_id, body, author_id, author_name)
      values (${id}, ${data.teamId}, ${data.methodId ?? null}, ${data.body}, ${context.userId}, ${authorName})
    `;
    return { id };
  });

/** Create a personal workspace team on first editor open if the user has none. */
export const ensureEditorWorkspace = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .handler(async ({ context }) => {
    const db = await sql();
    const existing = await db<TeamRow>`
      select t.id, t.name, t.invite_code, m.role
      from teams t
      join team_members m on m.team_id = t.id
      where m.user_id = ${context.userId}
      order by t.created_at asc
      limit 1
    `;
    if (existing[0]) return existing[0];
    const id = newId("team");
    const code = inviteCode();
    const name = BRAND;
    await db`
      insert into teams (id, name, invite_code, created_by)
      values (${id}, ${name}, ${code}, ${context.userId})
    `;
    await db`
      insert into team_members (team_id, user_id, role)
      values (${id}, ${context.userId}, ${"owner"})
    `;
    return { id, name, invite_code: code, role: "owner" as const };
  });

export const listSiteContent = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async () => {
    const db = await sql();
    return db<ContentOverride>`
      select
        method_id as id,
        'site'::text as team_id,
        method_id,
        title,
        lead,
        source,
        warn,
        notes,
        updated_by,
        updated_at::text as updated_at
      from site_content
      order by updated_at desc
    `;
  });

export const saveSiteContent = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator((data: { patch: MethodPatch }) => {
    if (!data.patch?.methodId) throw new Error("Нужна методика.");
    return data;
  })
  .handler(async ({ context, data }) => {
    const db = await sql();
    const p = data.patch;
    await db`
      insert into site_content (method_id, title, lead, source, warn, notes, updated_by)
      values (
        ${p.methodId},
        ${p.title ?? null},
        ${p.lead ?? null},
        ${p.source ?? null},
        ${p.warn ?? null},
        ${p.notes ?? null},
        ${context.userId}
      )
      on conflict (method_id) do update set
        title = excluded.title,
        lead = excluded.lead,
        source = excluded.source,
        warn = excluded.warn,
        notes = excluded.notes,
        updated_by = excluded.updated_by,
        updated_at = CURRENT_TIMESTAMP
    `;
    return { ok: true as const };
  });

/** Public: catalog method with site_content merged (no auth). */
export const getPublicMethod = createServerFn({ method: "GET" })
  .validator((data: { id: string }) => {
    if (!data?.id) throw new Error("Нужен id методики.");
    return data;
  })
  .handler(async ({ data }): Promise<Test | null> => {
    const base = getTest(data.id);
    if (!base) return null;
    try {
      const db = await sql();
      const rows = await db<ContentOverride>`
        select
          method_id as id,
          'site'::text as team_id,
          method_id,
          title,
          lead,
          source,
          warn,
          notes,
          updated_by,
          updated_at::text as updated_at
        from site_content
        where method_id = ${data.id}
        limit 1
      `;
      return applyContentOverride(base, rows[0] ?? null);
    } catch {
      // No DATABASE_URL / memory-only Workers: serve static catalog.
      return base;
    }
  });

export const listPublicCatalog = createServerFn({ method: "GET" }).handler(
  async (): Promise<Test[]> => {
    try {
      const db = await sql();
      const rows = await db<ContentOverride>`
        select
          method_id as id,
          'site'::text as team_id,
          method_id,
          title,
          lead,
          source,
          warn,
          notes,
          updated_by,
          updated_at::text as updated_at
        from site_content
      `;
      const byId = new Map(rows.map((r) => [r.method_id, r]));
      return TESTS.map((t) => applyContentOverride(t, byId.get(t.id) ?? null));
    } catch {
      return TESTS;
    }
  },
);
