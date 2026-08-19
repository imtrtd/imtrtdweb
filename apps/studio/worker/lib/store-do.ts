/**
 * SQLite-backed Durable Object store used when D1 is unavailable on the account.
 */
import { DurableObject } from "cloudflare:workers";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS leads (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact TEXT NOT NULL,
  task_type TEXT NOT NULL DEFAULT '',
  budget TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'new',
  note TEXT NOT NULL DEFAULT '',
  next_step TEXT NOT NULL DEFAULT '',
  brief_url TEXT NOT NULL DEFAULT '',
  first_response_at TEXT,
  reminded_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_created ON leads(created_at DESC);
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  sort_order INTEGER NOT NULL DEFAULT 0,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS site_copy (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
`;

const SEED = `
INSERT OR IGNORE INTO site_copy (key, value, updated_at) VALUES
  ('brand', 'I''m Trying To Design', datetime('now')),
  ('headline', 'Дизайн, который держит продукт вместе', datetime('now')),
  ('subhead', 'Студия цифрового дизайна: брендинг, интерфейсы и визуальные системы для команд, которым нужен ясный результат.', datetime('now')),
  ('cta_label', 'Оставить заявку', datetime('now')),
  ('contact_email', 'hello@imtryingtodesign.com', datetime('now')),
  ('contact_telegram', '@imtrtd', datetime('now')),
  ('cf_beacon_token', '', datetime('now'));
INSERT OR IGNORE INTO services (id, title, description, sort_order, published, created_at, updated_at) VALUES
  ('svc-brand', 'Брендинг', 'Идентичность, голос и визуальная система, с которой продукт узнаваем.', 1, 1, datetime('now'), datetime('now')),
  ('svc-product', 'Product UI', 'Интерфейсы продуктов и кабинетов: структура, состояния, аккуратная детализация.', 2, 1, datetime('now'), datetime('now')),
  ('svc-landing', 'Лендинги', 'Посадочные с ясным героем, одним CTA и сильной визуальной подачей.', 3, 1, datetime('now'), datetime('now')),
  ('svc-system', 'Дизайн-системы', 'Токены, компоненты и правила, чтобы команда масштабировалась без хаоса.', 4, 1, datetime('now'), datetime('now'));
INSERT OR IGNORE INTO cases (id, title, role, result, image_url, sort_order, published, created_at, updated_at) VALUES
  ('case-north', 'Northline', 'Бренд + сайт', 'Собран визуальный язык и лендинг для B2B-платформы.', '', 1, 1, datetime('now'), datetime('now')),
  ('case-orbit', 'Orbit Pay', 'Product UI', 'Упрощён онбординг и ключевые экраны платежного кабинета.', '', 2, 1, datetime('now'), datetime('now')),
  ('case-atelier', 'Atelier 12', 'Брендинг', 'Идентичность для студии пространства и набор носителей.', '', 3, 1, datetime('now'), datetime('now')),
  ('case-signal', 'Signal Desk', 'Лендинг', 'Конверсионная посадочная для аналитического инструмента.', '', 4, 1, datetime('now'), datetime('now'));
`;

type SqlValue = string | number | null;

export class AppStore extends DurableObject {
	private ready = false;

	private ensure() {
		if (this.ready) {
			return;
		}
		for (const statement of SCHEMA.split(";")
			.map((part) => part.trim())
			.filter(Boolean)) {
			this.ctx.storage.sql.exec(statement);
		}
		for (const statement of SEED.split(";")
			.map((part) => part.trim())
			.filter(Boolean)) {
			this.ctx.storage.sql.exec(statement);
		}
		this.ready = true;
	}

	async fetch(request: Request): Promise<Response> {
		this.ensure();
		const url = new URL(request.url);
		if (url.pathname !== "/sql") {
			return Response.json({ error: "Not Found" }, { status: 404 });
		}

		const body = (await request.json()) as {
			query: string;
			params?: SqlValue[];
			mode?: "all" | "first" | "run";
		};

		try {
			const cursor = this.ctx.storage.sql.exec(
				body.query,
				...(body.params ?? []),
			);
			const mode = body.mode ?? "all";
			if (mode === "run") {
				return Response.json({ ok: true, rowsWritten: cursor.rowsWritten });
			}
			const rows = cursor.toArray();
			if (mode === "first") {
				return Response.json({ result: rows[0] ?? null });
			}
			return Response.json({ results: rows });
		} catch (error) {
			return Response.json(
				{ error: error instanceof Error ? error.message : "SQL error" },
				{ status: 500 },
			);
		}
	}
}

/** D1-compatible facade over AppStore DO. */
export function doDatabase(env: Env): D1Database {
	const id = env.APP_STORE.idFromName("main");
	const stub = env.APP_STORE.get(id);

	const runSql = async (
		query: string,
		params: SqlValue[],
		mode: "all" | "first" | "run",
	) => {
		const response = await stub.fetch("https://store/sql", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ query, params, mode }),
		});
		const data = (await response.json()) as {
			results?: Record<string, unknown>[];
			result?: Record<string, unknown> | null;
			error?: string;
		};
		if (!response.ok) {
			throw new Error(data.error || "Store SQL failed");
		}
		return data;
	};

	const prepare = (query: string) => {
		const params: SqlValue[] = [];
		const stmt = {
			bind(...values: SqlValue[]) {
				params.splice(0, params.length, ...values);
				return stmt;
			},
			async first<T>() {
				const data = await runSql(query, params, "first");
				return (data.result as T) ?? null;
			},
			async all<T>() {
				const data = await runSql(query, params, "all");
				return { results: (data.results as T[]) ?? [] };
			},
			async run() {
				await runSql(query, params, "run");
				return { success: true };
			},
		};
		return stmt;
	};

	return {
		prepare,
		batch: async (statements: { run: () => Promise<unknown> }[]) => {
			const out = [];
			for (const statement of statements) {
				out.push(await statement.run());
			}
			return out;
		},
		exec: async (query: string) => {
			await runSql(query, [], "run");
			return { count: 0, duration: 0 };
		},
	} as unknown as D1Database;
}
