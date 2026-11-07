import { DB, StoreStub } from "./store";
import { TG } from "./tg";

export interface Env {
  STORE: DurableObjectNamespace;
  TELEGRAM_BOT_TOKEN: string;
  BOT_ID: string;
  BOT_USERNAME: string;
  /** Owner's numeric Telegram id (optional; DM owner commands). */
  OWNER_ID?: string;
  /** Owner's @username without "@": only a Business connection from this account is accepted. */
  OWNER_USERNAME?: string;
  TIMEZONE: string;
  PUBLIC_URL: string;
  /** Optional Worker secret: enables LLM answers for Business messages via xAI. */
  XAI_API_KEY?: string;
  XAI_MODEL?: string;
}

export const ANON_ADMIN_BOT = 1087968824; // @GroupAnonymousBot

export interface Settings {
  chat_id: number; title: string | null;
  welcome_enabled: number; welcome_text: string | null; rules_text: string | null;
  clean_service: number;
  captcha: number; captcha_sec: number; newbie_min: number;
  antilink: number; link_min: number;
  flood_limit: number; flood_sec: number; flood_mute_min: number;
  warn_limit: number; warn_mute_hours: number;
}

export const DEFAULT_WELCOME = "Привет, {name}! 👋 Добро пожаловать в «{chat}». Правила — /rules.";

async function hmacHex(key: string, msg: string): Promise<string> {
  const k = await crypto.subtle.importKey("raw", new TextEncoder().encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Secrets derived from the bot token, so no extra secrets are needed. */
export const webhookSecret = (env: Env) => hmacHex(env.TELEGRAM_BOT_TOKEN, "webhook:imtrtd-groups");
export const setupKey = (env: Env) => hmacHex(env.TELEGRAM_BOT_TOKEN, "setup:imtrtd-groups");

const adminCache = new Map<string, { v: boolean; exp: number }>();

export class Ctx {
  db: DB;
  tg: TG;
  tz: string;
  botId: number;
  constructor(public env: Env, public exec?: ExecutionContext) {
    this.db = new DB(env.STORE.get(env.STORE.idFromName("main")) as unknown as StoreStub);
    this.tg = new TG(env.TELEGRAM_BOT_TOKEN);
    this.tz = env.TIMEZONE || "Europe/Kiev";
    this.botId = Number(env.BOT_ID);
  }

  async settings(chatId: number): Promise<Settings> {
    let s = await this.db.one<Settings>("SELECT * FROM settings WHERE chat_id = ?", chatId);
    if (!s) {
      await this.db.run("INSERT OR IGNORE INTO settings(chat_id) VALUES (?)", chatId);
      s = (await this.db.one<Settings>("SELECT * FROM settings WHERE chat_id = ?", chatId))!;
    }
    return s;
  }

  async send(chatId: number, text: string, extra: Record<string, unknown> = {}): Promise<any> {
    const params: Record<string, unknown> = { chat_id: chatId, text, parse_mode: "HTML", link_preview_options: { is_disabled: true }, ...extra };
    try { return await this.tg.call("sendMessage", params); }
    catch (e: any) {
      if (params.reply_parameters && /reply|thread/i.test(e?.description ?? "")) {
        delete params.reply_parameters;
        if (/thread/i.test(e.description)) delete params.message_thread_id;
        return this.tg.try("sendMessage", params);
      }
      console.warn(String(e?.message ?? e));
      return null;
    }
  }

  /** Reply to a message (same topic), optionally auto-deleting the reply after N seconds. */
  async reply(msg: any, text: string, deleteAfterSec = 0, extra: Record<string, unknown> = {}): Promise<any> {
    const p: Record<string, unknown> = { reply_parameters: { message_id: msg.message_id, allow_sending_without_reply: true }, ...extra };
    if (msg.is_topic_message && msg.message_thread_id) p.message_thread_id = msg.message_thread_id;
    const m = await this.send(msg.chat.id, text, p);
    if (m && deleteAfterSec > 0) await this.cleanupLater(msg.chat.id, m.message_id, deleteAfterSec);
    return m;
  }

  async cleanupLater(chatId: number, messageId: number, afterSec: number) {
    await this.db.run("INSERT OR REPLACE INTO cleanup(chat_id, message_id, delete_at) VALUES (?,?,?)", chatId, messageId, Date.now() + afterSec * 1000);
  }

  /** getChatMember-based admin check, cached for 2 minutes per isolate. */
  async isAdminUser(chatId: number, userId: number): Promise<boolean> {
    const key = `${chatId}:${userId}`;
    const hit = adminCache.get(key);
    if (hit && hit.exp > Date.now()) return hit.v;
    const m = await this.tg.try<any>("getChatMember", { chat_id: chatId, user_id: userId });
    const v = m?.status === "creator" || m?.status === "administrator";
    adminCache.set(key, { v, exp: Date.now() + 120_000 });
    return v;
  }

  /** Admin check for a message sender, incl. anonymous admins (sender_chat = the group itself). */
  async isAdminMsg(msg: any): Promise<boolean> {
    const chatId = msg.chat.id;
    if (msg.sender_chat?.id === chatId) return true;
    if (!msg.from || msg.from.id === ANON_ADMIN_BOT) return false;
    return this.isAdminUser(chatId, msg.from.id);
  }

  /** Owner = OWNER_ID var or the accepted Business connection user (stored in kv "owner_id"). */
  async isOwner(userId: number | undefined): Promise<boolean> {
    if (!userId) return false;
    if (this.env.OWNER_ID && Number(this.env.OWNER_ID) === userId) return true;
    return Number(await this.db.getKv("owner_id")) === userId;
  }
}
