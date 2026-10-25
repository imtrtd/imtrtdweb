import { DurableObject } from "cloudflare:workers";

export type SqlParam = string | number | null;
export type Row = Record<string, any>;

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS chats(chat_id INTEGER PRIMARY KEY, title TEXT, is_forum INTEGER DEFAULT 0, updated_at INTEGER)`,
  `CREATE TABLE IF NOT EXISTS settings(
     chat_id INTEGER PRIMARY KEY,
     antispam INTEGER DEFAULT 1, antilink INTEGER DEFAULT 1, antiflood INTEGER DEFAULT 1,
     flood_limit INTEGER DEFAULT 6, newbie_hours INTEGER DEFAULT 24,
     welcome_enabled INTEGER DEFAULT 1, welcome_text TEXT,
     clean_service INTEGER DEFAULT 1, ai_enabled INTEGER DEFAULT 1, warn_limit INTEGER DEFAULT 3)`,
  `CREATE TABLE IF NOT EXISTS users(user_id INTEGER PRIMARY KEY, username TEXT, uname TEXT, first_name TEXT, updated_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS users_uname ON users(uname)`,
  `CREATE TABLE IF NOT EXISTS members(chat_id INTEGER, user_id INTEGER, joined_at INTEGER, warns INTEGER DEFAULT 0, welcomed_at INTEGER DEFAULT 0, PRIMARY KEY(chat_id, user_id))`,
  `CREATE TABLE IF NOT EXISTS history(id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER, thread_id INTEGER, user_id INTEGER, name TEXT, text TEXT, is_bot INTEGER DEFAULT 0, ts INTEGER)`,
  `CREATE INDEX IF NOT EXISTS history_thread ON history(chat_id, thread_id, id)`,
  `CREATE TABLE IF NOT EXISTS bot_msgs(chat_id INTEGER, message_id INTEGER, ts INTEGER, PRIMARY KEY(chat_id, message_id))`,
  `CREATE TABLE IF NOT EXISTS flood(chat_id INTEGER, user_id INTEGER, win INTEGER, cnt INTEGER, PRIMARY KEY(chat_id, user_id))`,
  `CREATE TABLE IF NOT EXISTS lists(id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER, thread_id INTEGER, name TEXT, created_by INTEGER, created_at INTEGER, message_id INTEGER)`,
  `CREATE TABLE IF NOT EXISTS list_items(id INTEGER PRIMARY KEY AUTOINCREMENT, list_id INTEGER, text TEXT, done INTEGER DEFAULT 0, added_by INTEGER, created_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS list_items_list ON list_items(list_id, id)`,
  `CREATE TABLE IF NOT EXISTS tasks(
     id INTEGER PRIMARY KEY AUTOINCREMENT, chat_id INTEGER, thread_id INTEGER, text TEXT,
     assignee_id INTEGER, assignee_name TEXT, created_by INTEGER, creator_name TEXT,
     due_at INTEGER, reminded INTEGER DEFAULT 0, done INTEGER DEFAULT 0, done_at INTEGER, created_at INTEGER)`,
  `CREATE INDEX IF NOT EXISTS tasks_due ON tasks(done, reminded, due_at)`,
  `CREATE TABLE IF NOT EXISTS cleanup(chat_id INTEGER, message_id INTEGER, delete_at INTEGER, PRIMARY KEY(chat_id, message_id))`,
  `CREATE TABLE IF NOT EXISTS topics(chat_id INTEGER, thread_id INTEGER, name TEXT, updated_at INTEGER, PRIMARY KEY(chat_id, thread_id))`,
  `CREATE TABLE IF NOT EXISTS plans_seen(chat_id INTEGER, message_id INTEGER, ts INTEGER, PRIMARY KEY(chat_id, message_id))`,
];

/** Additive column migrations; "duplicate column" errors on re-run are expected and ignored. */
const COLUMNS = [
  `ALTER TABLE tasks ADD COLUMN remind_at INTEGER`, // reminder time if different from due_at
  `ALTER TABLE tasks ADD COLUMN src_msg_id INTEGER`, // message the task was parsed from (auto-plans)
];

/** Single SQLite-backed Durable Object holding all bot state. */
export class BotStore extends DurableObject {
  constructor(ctx: DurableObjectState, env: unknown) {
    super(ctx, env as any);
    ctx.blockConcurrencyWhile(async () => {
      for (const stmt of SCHEMA) ctx.storage.sql.exec(stmt);
      for (const stmt of COLUMNS) { try { ctx.storage.sql.exec(stmt); } catch { /* already applied */ } }
    });
  }

  q(sql: string, params: SqlParam[] = []): Row[] {
    return this.ctx.storage.sql.exec(sql, ...params).toArray() as Row[];
  }

  /** Run several statements atomically. */
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
  all<T = Row>(sql: string, ...p: SqlParam[]): Promise<T[]> {
    return this.stub.q(sql, p) as Promise<T[]>;
  }
  async one<T = Row>(sql: string, ...p: SqlParam[]): Promise<T | null> {
    return ((await this.stub.q(sql, p))[0] as T) ?? null;
  }
  async run(sql: string, ...p: SqlParam[]): Promise<void> {
    await this.stub.q(sql, p);
  }
  tx(stmts: Array<[string, SqlParam[]]>) {
    return this.stub.tx(stmts);
  }
}
