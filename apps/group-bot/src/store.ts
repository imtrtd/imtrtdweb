import { DurableObject } from "cloudflare:workers";

export type SqlParam = string | number | null;
export type Row = Record<string, any>;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS settings(
     chat_id INTEGER PRIMARY KEY,
     title TEXT,
     welcome_enabled INTEGER DEFAULT 1, welcome_text TEXT, rules_text TEXT,
     clean_service INTEGER DEFAULT 1,
     captcha INTEGER DEFAULT 1, captcha_sec INTEGER DEFAULT 120,
     newbie_min INTEGER DEFAULT 60,
     antilink INTEGER DEFAULT 1, link_min INTEGER DEFAULT 1440,
     flood_limit INTEGER DEFAULT 6, flood_sec INTEGER DEFAULT 10, flood_mute_min INTEGER DEFAULT 10,
     warn_limit INTEGER DEFAULT 3, warn_mute_hours INTEGER DEFAULT 24)`,
  `CREATE TABLE IF NOT EXISTS members(chat_id INTEGER, user_id INTEGER, joined_at INTEGER, warns INTEGER DEFAULT 0, PRIMARY KEY(chat_id, user_id))`,
  `CREATE TABLE IF NOT EXISTS words(chat_id INTEGER, word TEXT, PRIMARY KEY(chat_id, word))`,
  `CREATE TABLE IF NOT EXISTS flood(chat_id INTEGER, user_id INTEGER, win INTEGER, cnt INTEGER, PRIMARY KEY(chat_id, user_id))`,
  `CREATE TABLE IF NOT EXISTS captcha(chat_id INTEGER, user_id INTEGER, message_id INTEGER, deadline INTEGER, name TEXT, PRIMARY KEY(chat_id, user_id))`,
  `CREATE TABLE IF NOT EXISTS reminders(id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER, thread_id INTEGER, text TEXT, at INTEGER,
     created_by INTEGER, creator_name TEXT, done INTEGER DEFAULT 0, created_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS reminders_due ON reminders(done, at)`,
  `CREATE TABLE IF NOT EXISTS cleanup(chat_id INTEGER, message_id INTEGER, delete_at INTEGER, PRIMARY KEY(chat_id, message_id))`,
  `CREATE TABLE IF NOT EXISTS kv(key TEXT PRIMARY KEY, value TEXT)`,
  `CREATE TABLE IF NOT EXISTS biz_conn(id TEXT PRIMARY KEY, user_id INTEGER, user_chat_id INTEGER, can_reply INTEGER, is_enabled INTEGER, rights TEXT, updated_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS biz_chats(conn_id TEXT, chat_id INTEGER, last_auto INTEGER DEFAULT 0, owner_last INTEGER DEFAULT 0, PRIMARY KEY(conn_id, chat_id))`,
  `CREATE TABLE IF NOT EXISTS biz_history(id INTEGER PRIMARY KEY AUTOINCREMENT, conn_id TEXT, chat_id INTEGER, message_id INTEGER, role TEXT, text TEXT, ts INTEGER)`,
  `CREATE INDEX IF NOT EXISTS biz_history_chat ON biz_history(conn_id, chat_id, id)`,
];

/** Single SQLite-backed Durable Object holding all bot state. */
export class GroupStore extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env as any);
    ctx.blockConcurrencyWhile(async () => {
      for (const stmt of SCHEMA) ctx.storage.sql.exec(stmt);
    });
  }

  q(sql: string, params: SqlParam[] = []): Row[] {
    return this.ctx.storage.sql.exec(sql, ...params).toArray() as Row[];
  }

  tx(stmts: Array<[string, SqlParam[]]>): Row[][] {
    return this.ctx.storage.transactionSync(() => stmts.map(([s, p]) => this.ctx.storage.sql.exec(s, ...p).toArray() as Row[]));
  }
}

export interface StoreStub {
  q(sql: string, params?: SqlParam[]): Promise<Row[]>;
  tx(stmts: Array<[string, SqlParam[]]>): Promise<Row[][]>;
}

export class DB {
  constructor(private stub: StoreStub) {}
  all<T = Row>(sql: string, ...p: SqlParam[]): Promise<T[]> { return this.stub.q(sql, p) as Promise<T[]>; }
  async one<T = Row>(sql: string, ...p: SqlParam[]): Promise<T | null> { return ((await this.stub.q(sql, p))[0] as T) ?? null; }
  async run(sql: string, ...p: SqlParam[]): Promise<void> { await this.stub.q(sql, p); }
  tx(stmts: Array<[string, SqlParam[]]>) { return this.stub.tx(stmts); }
  async getKv(key: string): Promise<string | null> { return (await this.one<{ value: string }>("SELECT value FROM kv WHERE key = ?", key))?.value ?? null; }
  async setKv(key: string, value: string | null): Promise<void> {
    if (value === null) await this.run("DELETE FROM kv WHERE key = ?", key);
    else await this.run("INSERT INTO kv(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", key, value);
  }
}
