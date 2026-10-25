import { Ctx, DEFAULT_WELCOME, Settings } from "./env";
import { addItems, createList, refreshList, toggleItem } from "./lists";
import { createTask } from "./tasks";
import { userName } from "./tg";
import { zonedToUtc } from "./time";

async function hmac(key: ArrayBuffer | Uint8Array, msg: string): Promise<ArrayBuffer> {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return crypto.subtle.sign("HMAC", k, new TextEncoder().encode(msg));
}
const hex = (b: ArrayBuffer) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, "0")).join("");

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export interface InitData { user: any; auth_date: number; start_param?: string; chat_instance?: string; chat_type?: string; chat?: any }

/**
 * Validate Telegram WebApp initData (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app).
 * secret_key = HMAC_SHA256(key="WebAppData", msg=bot_token); hash = hex(HMAC_SHA256(key=secret_key, msg=data_check_string)).
 */
export async function validateInitData(initData: string, botToken: string, maxAgeSec = 86400): Promise<InitData | null> {
  if (!initData || initData.length > 8192) return null;
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash || !/^[0-9a-f]{64}$/.test(hash)) return null;
  params.delete("hash");
  const dcs = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([k, v]) => `${k}=${v}`).join("\n");
  const secret = await hmac(new TextEncoder().encode("WebAppData"), botToken);
  const calc = hex(await hmac(secret, dcs));
  if (!safeEqual(calc, hash)) return null;
  const authDate = Number(params.get("auth_date"));
  if (!authDate || Date.now() / 1000 - authDate > maxAgeSec) return null;
  let user: any = null;
  try { user = JSON.parse(params.get("user") ?? "null"); } catch { return null; }
  if (!user?.id) return null;
  let chat: any;
  try { chat = params.get("chat") ? JSON.parse(params.get("chat")!) : undefined; } catch { /* ignore */ }
  return { user, auth_date: authDate, start_param: params.get("start_param") ?? undefined, chat_instance: params.get("chat_instance") ?? undefined, chat_type: params.get("chat_type") ?? undefined, chat };
}

class HttpError extends Error { constructor(public status: number, msg: string) { super(msg); } }

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

async function requireMember(c: Ctx, chatId: number, userId: number): Promise<{ admin: boolean }> {
  const known = await c.db.one("SELECT chat_id FROM chats WHERE chat_id = ?", chatId);
  if (!known) throw new HttpError(404, "Чат не найден");
  const st = await c.memberStatus(chatId, userId);
  if (!["creator", "administrator", "member", "restricted"].includes(st) && userId !== c.ownerId) throw new HttpError(403, "Вы не участник этого чата");
  return { admin: await c.isAdminUser(chatId, userId) };
}

const SETTINGS_FIELDS: Array<keyof Settings> = ["antispam", "antilink", "antiflood", "flood_limit", "newbie_hours", "welcome_enabled", "clean_service", "ai_enabled", "warn_limit"];

export async function handleApi(c: Ctx, req: Request, action: string): Promise<Response> {
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  const init = await validateInitData(req.headers.get("x-telegram-init-data") ?? "", c.env.TELEGRAM_BOT_TOKEN);
  if (!init) return json({ ok: false, error: "invalid initData" }, 401);
  const user = init.user;
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  try {
    switch (action) {
      case "bootstrap": {
        const chats = await c.db.all("SELECT chat_id, title, is_forum FROM chats ORDER BY updated_at DESC LIMIT 20");
        const out: any[] = [];
        for (const ch of chats) {
          const st = await c.memberStatus(Number(ch.chat_id), user.id);
          if (["creator", "administrator", "member", "restricted"].includes(st) || user.id === c.ownerId) {
            out.push({ id: Number(ch.chat_id), title: ch.title, is_forum: !!ch.is_forum, is_admin: await c.isAdminUser(Number(ch.chat_id), user.id) });
          }
        }
        const sp = init.start_param?.match(/^(?:app_|c)?(-?\d+)$/)?.[1];
        return json({ ok: true, user: { id: user.id, name: userName(user) }, chats: out, preferred: sp ? Number(sp) : null, tz: c.tz });
      }
      case "overview": {
        const chatId = Number(body.chat_id);
        const { admin } = await requireMember(c, chatId, user.id);
        const lists = await c.db.all("SELECT id, name, thread_id, created_by FROM lists WHERE chat_id = ? ORDER BY id DESC LIMIT 50", chatId);
        const items = lists.length
          ? await c.db.all(`SELECT id, list_id, text, done FROM list_items WHERE list_id IN (${lists.map(() => "?").join(",")}) ORDER BY id`, ...lists.map((l) => Number(l.id)))
          : [];
        const tasks = await c.db.all(
          "SELECT id, text, assignee_id, assignee_name, created_by, creator_name, due_at, done, done_at, reminded FROM tasks WHERE chat_id = ? AND (done = 0 OR done_at > ?) ORDER BY done, due_at IS NULL, due_at, id LIMIT 200",
          chatId, Date.now() - 7 * 86400_000);
        const s = await c.settings(chatId);
        return json({
          ok: true, is_admin: admin,
          lists: lists.map((l) => ({ ...l, items: items.filter((i) => i.list_id === l.id) })),
          tasks,
          settings: { ...Object.fromEntries(SETTINGS_FIELDS.map((k) => [k, s[k]])), welcome_text: s.welcome_text || DEFAULT_WELCOME },
          now: Date.now(),
        });
      }
      case "list_create": {
        const chatId = Number(body.chat_id);
        await requireMember(c, chatId, user.id);
        const name = String(body.name ?? "").trim();
        if (!name) throw new HttpError(400, "Пустое название");
        const id = await createList(c, chatId, 0, name, user.id);
        return json({ ok: true, id });
      }
      case "item_add": {
        const list = await c.db.one("SELECT * FROM lists WHERE id = ?", Number(body.list_id));
        if (!list) throw new HttpError(404, "Список не найден");
        await requireMember(c, Number(list.chat_id), user.id);
        const texts = String(body.text ?? "").split(/\n|;/).map((x) => x.trim()).filter(Boolean);
        if (!texts.length) throw new HttpError(400, "Пустой пункт");
        await addItems(c, Number(list.id), texts, user.id);
        c.exec?.waitUntil(refreshList(c, Number(list.id)));
        return json({ ok: true });
      }
      case "item_toggle":
      case "item_delete": {
        const item = await c.db.one("SELECT i.id, i.list_id, l.chat_id FROM list_items i JOIN lists l ON l.id = i.list_id WHERE i.id = ?", Number(body.item_id));
        if (!item) throw new HttpError(404, "Пункт не найден");
        await requireMember(c, Number(item.chat_id), user.id);
        if (action === "item_toggle") await toggleItem(c, Number(item.id));
        else await c.db.run("DELETE FROM list_items WHERE id = ?", Number(item.id));
        c.exec?.waitUntil(refreshList(c, Number(item.list_id)));
        return json({ ok: true });
      }
      case "list_delete": {
        const list = await c.db.one("SELECT * FROM lists WHERE id = ?", Number(body.list_id));
        if (!list) throw new HttpError(404, "Список не найден");
        const { admin } = await requireMember(c, Number(list.chat_id), user.id);
        if (!admin && Number(list.created_by) !== user.id) throw new HttpError(403, "Удалить может автор или админ");
        if (list.message_id) c.exec?.waitUntil(c.tg.try("deleteMessage", { chat_id: list.chat_id, message_id: list.message_id }));
        await c.db.tx([["DELETE FROM list_items WHERE list_id = ?", [list.id]], ["DELETE FROM lists WHERE id = ?", [list.id]]]);
        return json({ ok: true });
      }
      case "task_create": {
        const chatId = Number(body.chat_id);
        await requireMember(c, chatId, user.id);
        const text = String(body.text ?? "").trim();
        if (!text) throw new HttpError(400, "Пустая задача");
        const due = parseLocal(body.due_local, c.tz);
        const t = await createTask(c, { chatId, threadId: 0, text, assigneeId: null, assigneeName: body.assignee ? String(body.assignee).slice(0, 64) : null, createdBy: user.id, creatorName: userName(user), due });
        return json({ ok: true, id: t.id });
      }
      case "task_update": {
        const t = await c.db.one("SELECT * FROM tasks WHERE id = ?", Number(body.task_id));
        if (!t) throw new HttpError(404, "Задача не найдена");
        const { admin } = await requireMember(c, Number(t.chat_id), user.id);
        const own = [Number(t.assignee_id), Number(t.created_by)].includes(user.id);
        if (!admin && !own) throw new HttpError(403, "Изменить может исполнитель, автор или админ");
        if (body.delete) { await c.db.run("DELETE FROM tasks WHERE id = ?", t.id); return json({ ok: true }); }
        if (typeof body.done === "boolean") await c.db.run("UPDATE tasks SET done = ?, done_at = ? WHERE id = ?", body.done ? 1 : 0, body.done ? Date.now() : null, t.id);
        if ("due_local" in body) await c.db.run("UPDATE tasks SET due_at = ?, remind_at = NULL, reminded = 0 WHERE id = ?", parseLocal(body.due_local, c.tz), t.id);
        if (typeof body.text === "string" && body.text.trim()) await c.db.run("UPDATE tasks SET text = ? WHERE id = ?", body.text.trim().slice(0, 500), t.id);
        return json({ ok: true });
      }
      case "settings_save": {
        const chatId = Number(body.chat_id);
        const { admin } = await requireMember(c, chatId, user.id);
        if (!admin) throw new HttpError(403, "Только для администраторов");
        await c.settings(chatId);
        const limits: Record<string, [number, number]> = { flood_limit: [2, 50], newbie_hours: [0, 720], warn_limit: [1, 10] };
        for (const k of SETTINGS_FIELDS) {
          if (!(k in body)) continue;
          let v = Number(body[k]);
          if (!Number.isFinite(v)) continue;
          v = limits[k] ? Math.max(limits[k][0], Math.min(limits[k][1], Math.round(v))) : v ? 1 : 0;
          await c.db.run(`UPDATE settings SET ${k} = ? WHERE chat_id = ?`, v, chatId);
        }
        if (typeof body.welcome_text === "string") await c.db.run("UPDATE settings SET welcome_text = ? WHERE chat_id = ?", body.welcome_text.trim().slice(0, 1000) || null, chatId);
        return json({ ok: true });
      }
      default:
        return json({ ok: false, error: "unknown action" }, 404);
    }
  } catch (e) {
    if (e instanceof HttpError) return json({ ok: false, error: e.message }, e.status);
    console.warn("api error", action, String((e as Error)?.message ?? e));
    return json({ ok: false, error: "Внутренняя ошибка" }, 500);
  }
}

function parseLocal(v: unknown, tz: string): number | null {
  if (typeof v !== "string" || !v) return null;
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!m) return null;
  return zonedToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], tz);
}
