import { Ctx } from "./env";
import { esc, truncate, userName } from "./tg";
import { fmtLocal } from "./time";
import { OWNER_COMMANDS } from "./setup";

/**
 * Telegram Business: the owner (@AkakiiJ) connects this bot in Settings → Telegram Business → Chatbots.
 * We answer incoming private messages on the owner's behalf (template or LLM), never the owner's own messages.
 */

export const DEFAULT_AUTOREPLY = [
  "Здравствуйте! 👋 Спасибо за сообщение — сейчас я не на связи, отвечу лично, как только смогу.",
  "",
  "🖋 Тату-студия NAMENLOS (Нюрнберг): https://instagram.com/namenlos_tattoo",
  "Для записи опишите идею, размер, место на теле и удобные даты — можно приложить референсы.",
  "",
  "💻 Веб-дизайн и сайты: https://imtrtd.space",
  "",
  "— автоответ",
].join("\n");

const SYSTEM_PROMPT = `Ты — вежливый ассистент, который отвечает в личных сообщениях Telegram от имени владельца аккаунта, пока он занят.
Владелец: тату-мастер и веб-дизайнер.
• Тату-студия NAMENLOS в Нюрнберге (Германия), Instagram: @namenlos_tattoo (https://instagram.com/namenlos_tattoo).
• Веб-дизайн и разработка сайтов: imtrtd.space (https://imtrtd.space).
Правила:
— Отвечай на языке собеседника (по умолчанию русский), коротко: 1–4 предложения, без markdown.
— Никогда не выдумывай цены, свободные даты, адреса, сроки и обещания. Если спрашивают цену/дату — скажи, что владелец уточнит лично, и попроси детали.
— Для тату-записи попроси: идею, размер в см, место на теле, цвет/ч-б, референсы, удобные даты.
— Для сайта попроси: что за проект, задачи, примеры, сроки и бюджет.
— Не называй себя ИИ-моделью и не упоминай провайдеров; при вопросе скажи, что ты ассистент-автоответчик, а владелец ответит лично.
— На личные, интимные или конфликтные темы не отвечай по существу — скажи, что владелец ответит сам.`;

const OWNER_TAKEOVER_MS = 30 * 60_000; // after the owner writes in a chat, stay silent there for 30 min
const MIN_GAP_MS = 15_000; // at most one auto-reply per chat per 15 s (LLM mode)

interface BizState { enabled: boolean; ai: boolean; pauseUntil: number; cooldownH: number; text: string | null }

async function state(c: Ctx): Promise<BizState> {
  const [en, ai, pause, cd, text] = await Promise.all(["biz_enabled", "biz_ai", "biz_pause_until", "biz_cooldown_h", "biz_text"].map((k) => c.db.getKv(k)));
  return { enabled: en !== "0", ai: ai !== "0", pauseUntil: Number(pause ?? 0), cooldownH: Number(cd ?? 12), text };
}

function ownerUsernameOk(c: Ctx, user: any): boolean {
  const want = (c.env.OWNER_USERNAME ?? "").replace(/^@/, "").toLowerCase();
  if (c.env.OWNER_ID && Number(c.env.OWNER_ID) === user?.id) return true;
  return !!want && String(user?.username ?? "").toLowerCase() === want;
}

export async function onBusinessConnection(c: Ctx, bc: any) {
  const allowed = ownerUsernameOk(c, bc.user) || Number(await c.db.getKv("owner_id")) === bc.user?.id;
  const canReply = bc.rights ? (bc.rights.can_reply ? 1 : 0) : bc.can_reply ? 1 : 0;
  if (!allowed) {
    console.warn("business connection from a non-owner ignored", JSON.stringify({ user: bc.user?.id }));
    await c.send(bc.user_chat_id, "Этот бот обслуживает только аккаунт своего владельца. Подключение не будет использоваться.");
    return;
  }
  await c.db.run(
    `INSERT INTO biz_conn(id, user_id, user_chat_id, can_reply, is_enabled, rights, updated_at) VALUES (?,?,?,?,?,?,?)
     ON CONFLICT(id) DO UPDATE SET can_reply = excluded.can_reply, is_enabled = excluded.is_enabled, rights = excluded.rights, updated_at = excluded.updated_at, user_chat_id = excluded.user_chat_id`,
    bc.id, bc.user.id, bc.user_chat_id, canReply, bc.is_enabled ? 1 : 0, JSON.stringify(bc.rights ?? {}), Date.now());
  await c.db.setKv("owner_id", String(bc.user.id));
  await c.tg.try("setMyCommands", { commands: OWNER_COMMANDS, scope: { type: "chat", chat_id: bc.user.id } });
  if (!bc.is_enabled) return c.send(bc.user_chat_id, "🔌 Бизнес-подключение отключено. Автоответы не отправляются.");
  const s = await state(c);
  await c.send(bc.user_chat_id, [
    "✅ <b>Бот подключён к вашему аккаунту (Telegram Business).</b>",
    `Право отвечать: ${canReply ? "есть ✅" : "нет ❌ — включите «Отвечать на сообщения» в настройках чат-бота"}`,
    `Автоответы: ${s.enabled ? "вкл" : "выкл"} · режим: ${c.env.XAI_API_KEY && s.ai ? "ИИ (xAI)" : "шаблон"}`,
    "",
    "Команды: /business on|off, /business ai on|off, /setautoreply, /pause N, /cooldown H",
  ].join("\n"));
}

async function remember(c: Ctx, connId: string, chatId: number, messageId: number, role: string, text: string) {
  if (!text) return;
  await c.db.run("INSERT INTO biz_history(conn_id, chat_id, message_id, role, text, ts) VALUES (?,?,?,?,?,?)", connId, chatId, messageId, role, truncate(text, 2000), Date.now());
}

async function llmAnswer(c: Ctx, connId: string, chatId: number, clientName: string): Promise<string | null> {
  const hist = (await c.db.all<any>("SELECT role, text FROM biz_history WHERE conn_id = ? AND chat_id = ? ORDER BY id DESC LIMIT 12", connId, chatId)).reverse();
  const messages = [
    { role: "system", content: SYSTEM_PROMPT + `\nИмя собеседника: ${clientName}.` },
    ...hist.map((h) => ({ role: h.role === "user" ? "user" : "assistant", content: h.text })),
  ];
  if (c.env.XAI_API_KEY) {
    try {
      const r = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${c.env.XAI_API_KEY}` },
        body: JSON.stringify({ model: c.env.XAI_MODEL || "grok-3-mini", messages, max_tokens: 400, temperature: 0.4 }),
      });
      const j: any = await r.json();
      const t = j?.choices?.[0]?.message?.content;
      if (typeof t === "string" && t.trim()) return t.trim();
      console.warn("xai: empty answer", r.status);
    } catch (e) { console.warn("xai failed", String((e as Error).message)); }
  }
  return null;
}

export async function onBusinessMessage(c: Ctx, msg: any, edited = false) {
  const connId = msg.business_connection_id;
  if (!connId || msg.chat?.type !== "private") return;
  const conn = await c.db.one<any>("SELECT * FROM biz_conn WHERE id = ?", connId);
  if (!conn) {
    // Unknown connection (e.g. created before the webhook): fetch it.
    const bc = await c.tg.try<any>("getBusinessConnection", { business_connection_id: connId });
    if (bc) await onBusinessConnection(c, bc);
    return;
  }
  const chatId = msg.chat.id;
  const text = String(msg.text ?? msg.caption ?? "");
  const fromOwner = msg.from?.id === conn.user_id;
  await remember(c, connId, chatId, msg.message_id, fromOwner ? "owner" : "user", text || (msg.sticker ? "[стикер]" : msg.photo ? "[фото]" : msg.voice ? "[голосовое]" : "[вложение]"));
  if (fromOwner) {
    await c.db.run(`INSERT INTO biz_chats(conn_id, chat_id, owner_last) VALUES (?,?,?) ON CONFLICT(conn_id, chat_id) DO UPDATE SET owner_last = excluded.owner_last`, connId, chatId, Date.now());
    return;
  }
  if (edited || msg.from?.is_bot || msg.sender_business_bot) return;
  if (!conn.is_enabled || !conn.can_reply) return;
  const s = await state(c);
  if (!s.enabled || s.pauseUntil > Date.now()) return;
  const chat = await c.db.one<any>("SELECT * FROM biz_chats WHERE conn_id = ? AND chat_id = ?", connId, chatId);
  const now = Date.now();
  if (chat && now - chat.owner_last < OWNER_TAKEOVER_MS) return;

  const useAi = s.ai && !!c.env.XAI_API_KEY;
  if (useAi) { if (chat && now - chat.last_auto < MIN_GAP_MS) return; }
  else if (chat && now - chat.last_auto < s.cooldownH * 3600_000) return; // template: once per cooldown per chat

  await c.db.run(`INSERT INTO biz_chats(conn_id, chat_id, last_auto) VALUES (?,?,?) ON CONFLICT(conn_id, chat_id) DO UPDATE SET last_auto = excluded.last_auto`, connId, chatId, now);
  let answer = useAi ? await llmAnswer(c, connId, chatId, userName(msg.from)) : null;
  if (!answer) answer = (s.text || DEFAULT_AUTOREPLY).replace(/\{name\}/g, msg.from?.first_name ?? "");
  const sent = await c.tg.try<any>("sendMessage", {
    business_connection_id: connId, chat_id: chatId, text: truncate(answer, 4000), link_preview_options: { is_disabled: true },
  });
  if (sent) await remember(c, connId, chatId, sent.message_id, "assistant", answer);
}

export async function onDeletedBusinessMessages(c: Ctx, upd: any) {
  const ids: number[] = upd.message_ids ?? [];
  if (!upd.business_connection_id || !ids.length) return;
  await c.db.tx(ids.slice(0, 100).map((id) => ["DELETE FROM biz_history WHERE conn_id = ? AND chat_id = ? AND message_id = ?", [upd.business_connection_id, upd.chat.id, id]]));
}

/** Owner commands in the bot's own DM. Returns true if handled. */
export async function ownerCommand(c: Ctx, msg: any, cmd: string, args: string): Promise<boolean> {
  if (!["business", "setautoreply", "pause", "cooldown"].includes(cmd)) return false;
  if (!(await c.isOwner(msg.from?.id))) { await c.reply(msg, "Эта команда доступна только владельцу бота."); return true; }
  const a = args.trim();
  if (cmd === "setautoreply") {
    const t = a || String(msg.reply_to_message?.text ?? "").trim();
    if (!t) { await c.reply(msg, "Текущий автоответ:\n\n" + esc((await state(c)).text || DEFAULT_AUTOREPLY) + "\n\nИзменить: <code>/setautoreply текст</code> (переменная <code>{name}</code>), сбросить: <code>/setautoreply default</code>"); return true; }
    await c.db.setKv("biz_text", /^(default|сброс)$/i.test(t) ? null : truncate(t, 3500));
    await c.reply(msg, "✅ Текст автоответа сохранён.");
    return true;
  }
  if (cmd === "pause") {
    const n = Number(a.match(/\d+/)?.[0] ?? 60);
    const until = n > 0 ? Date.now() + Math.min(n, 60 * 24 * 30) * 60_000 : 0;
    await c.db.setKv("biz_pause_until", String(until));
    await c.reply(msg, until ? `⏸ Автоответы на паузе до ${fmtLocal(until, c.tz)} (Киев). Возобновить: <code>/pause 0</code>` : "▶️ Пауза снята.");
    return true;
  }
  if (cmd === "cooldown") {
    const h = Number(a);
    if (!Number.isFinite(h) || h < 0 || h > 720) { await c.reply(msg, "Через сколько часов шаблонный автоответ можно повторить тому же человеку: <code>/cooldown 12</code>"); return true; }
    await c.db.setKv("biz_cooldown_h", String(h));
    await c.reply(msg, `✅ Шаблонный автоответ — не чаще раза в ${h} ч на один чат.`);
    return true;
  }
  // /business [on|off|ai on|ai off]
  const m = a.toLowerCase().match(/^(ai\s+)?(on|off|вкл|выкл)$/);
  if (m) {
    const v = /^(on|вкл)$/.test(m[2]) ? "1" : "0";
    await c.db.setKv(m[1] ? "biz_ai" : "biz_enabled", v);
  }
  const s = await state(c);
  const conns = await c.db.all<any>("SELECT * FROM biz_conn ORDER BY updated_at DESC LIMIT 3");
  const conn = conns[0];
  await c.reply(msg, [
    "💼 <b>Telegram Business</b>",
    conn ? `Подключение: ${conn.is_enabled ? "активно ✅" : "отключено ❌"} · право отвечать: ${conn.can_reply ? "да" : "нет"}` : "Подключение: нет — подключите бота в Telegram → Настройки → Telegram Business → Чат-боты.",
    `Автоответы: ${s.enabled ? "вкл ✅" : "выкл ❌"}${s.pauseUntil > Date.now() ? ` · пауза до ${fmtLocal(s.pauseUntil, c.tz)}` : ""}`,
    `Режим: ${c.env.XAI_API_KEY ? (s.ai ? "ИИ (xAI) ✅" : "шаблон (ИИ выключен)") : "шаблон (ключ ИИ не задан)"}`,
    `Шаблон: не чаще раза в ${s.cooldownH} ч на чат · после вашего ответа в чате бот молчит 30 мин`,
    "",
    "/business on|off · /business ai on|off · /setautoreply · /pause N · /cooldown H",
  ].join("\n"));
  return true;
}
