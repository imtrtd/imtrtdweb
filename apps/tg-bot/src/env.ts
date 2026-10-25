import { DB, StoreStub } from "./store";
import { TG } from "./tg";

export interface Env {
  AI: Ai;
  STORE: DurableObjectNamespace;
  TELEGRAM_BOT_TOKEN: string;
  BOT_ID: string;
  BOT_USERNAME: string;
  OWNER_ID: string;
  TIMEZONE: string;
  HOME_CHAT_ID?: string;
  PUBLIC_URL: string;
  AI_MODEL: string;
  AI_FALLBACK_MODEL: string;
}

export const ANON_ADMIN_BOT = 1087968824; // @GroupAnonymousBot

export interface Settings {
  chat_id: number;
  antispam: number; antilink: number; antiflood: number;
  flood_limit: number; newbie_hours: number;
  welcome_enabled: number; welcome_text: string | null;
  clean_service: number; ai_enabled: number; warn_limit: number;
}

export const DEFAULT_WELCOME = "Привет, {name}! 👋 Добро пожаловать в «{chat}». Напиши /help, чтобы узнать, что я умею.";

const adminCache = new Map<string, { v: boolean; exp: number }>();
const memberCache = new Map<string, { v: string; exp: number }>();

async function hmacHex(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Secrets derived from the bot token (so no extra secrets are needed). */
export const webhookSecret = (env: Env) => hmacHex(env.TELEGRAM_BOT_TOKEN, "webhook:namenlos");
export const setupKey = (env: Env) => hmacHex(env.TELEGRAM_BOT_TOKEN, "setup:namenlos");

export class Ctx {
  db: DB;
  tg: TG;
  tz: string;
  botId: number;
  ownerId: number;
  constructor(public env: Env, public exec?: ExecutionContext) {
    const stub = env.STORE.get(env.STORE.idFromName("main")) as unknown as StoreStub;
    this.db = new DB(stub);
    this.tg = new TG(env.TELEGRAM_BOT_TOKEN);
    this.tz = env.TIMEZONE || "Europe/Kiev";
    this.botId = Number(env.BOT_ID);
    this.ownerId = Number(env.OWNER_ID);
  }

  get botUsername() { return this.env.BOT_USERNAME; }

  async settings(chatId: number): Promise<Settings> {
    let s = await this.db.one<Settings>("SELECT * FROM settings WHERE chat_id = ?", chatId);
    if (!s) {
      await this.db.run("INSERT OR IGNORE INTO settings(chat_id) VALUES (?)", chatId);
      s = (await this.db.one<Settings>("SELECT * FROM settings WHERE chat_id = ?", chatId))!;
    }
    return s;
  }

  /** Send a message into a chat/topic and remember it as ours (for reply-to-bot detection + AI context). */
  async send(chatId: number, threadId: number, text: string, extra: Record<string, unknown> = {}, remember = true): Promise<any> {
    const params: Record<string, unknown> = { chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...extra };
    if (threadId) params.message_thread_id = threadId;
    let m: any;
    try {
      m = await this.tg.call("sendMessage", params);
    } catch (e: any) {
      // Topic deleted/closed or reply target gone: retry without reply/thread.
      if (/thread|reply/i.test(e?.description ?? "")) {
        delete params.reply_parameters;
        if (/thread/i.test(e.description)) delete params.message_thread_id;
        m = await this.tg.call("sendMessage", params);
      } else throw e;
    }
    if (m && remember) await this.rememberBotMsg(chatId, threadId, m.message_id, text);
    return m;
  }

  async rememberBotMsg(chatId: number, threadId: number, messageId: number, text?: string) {
    const now = Date.now();
    const stmts: Array<[string, any[]]> = [["INSERT OR IGNORE INTO bot_msgs(chat_id, message_id, ts) VALUES (?,?,?)", [chatId, messageId, now]]];
    if (text) stmts.push(["INSERT INTO history(chat_id, thread_id, user_id, name, text, is_bot, ts) VALUES (?,?,?,?,?,1,?)",
      [chatId, threadId, this.botId, "Grok Assistant", text.replace(/<[^>]+>/g, "").slice(0, 2000), now]]);
    await this.db.tx(stmts);
  }

  /** Schedule auto-deletion of a message (processed by cron). */
  async cleanupLater(chatId: number, messageId: number, afterSec: number) {
    await this.db.run("INSERT OR REPLACE INTO cleanup(chat_id, message_id, delete_at) VALUES (?,?,?)", chatId, messageId, Date.now() + afterSec * 1000);
  }

  async memberStatus(chatId: number, userId: number): Promise<string> {
    const key = `${chatId}:${userId}`;
    const c = memberCache.get(key);
    if (c && c.exp > Date.now()) return c.v;
    const m = await this.tg.try("getChatMember", { chat_id: chatId, user_id: userId });
    let v = m?.status ?? "unknown";
    if (v === "restricted" && m && !m.is_member) v = "left";
    memberCache.set(key, { v, exp: Date.now() + 60_000 });
    return v;
  }

  async isAdminUser(chatId: number, userId: number): Promise<boolean> {
    if (userId === this.ownerId) return true;
    const key = `${chatId}:${userId}`;
    const c = adminCache.get(key);
    if (c && c.exp > Date.now()) return c.v;
    const st = await this.memberStatus(chatId, userId);
    const v = st === "creator" || st === "administrator";
    adminCache.set(key, { v, exp: Date.now() + 120_000 });
    return v;
  }

  /** Admin check for a message sender, including anonymous admins (sender_chat = the group). */
  async isAdminMsg(msg: any): Promise<boolean> {
    const chatId = msg.chat.id;
    if (msg.sender_chat?.id === chatId) return true;
    if (!msg.from) return false;
    if (msg.from.id === ANON_ADMIN_BOT) return msg.sender_chat?.id === chatId;
    return this.isAdminUser(chatId, msg.from.id);
  }
}
