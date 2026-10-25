import { ANON_ADMIN_BOT, Ctx, DEFAULT_WELCOME, Settings } from "./env";
import { esc, mentionHtml, TgError, truncate, userName } from "./tg";
import { aiReply, recordHistory } from "./ai";
import { fmtDate, humanDuration, parseDuration, parseWhen } from "./time";
import { addItems, createList, listItems, renderList, repostList, resolveList, toggleItem, getList } from "./lists";
import { createTask, reminderMarkup, renderTasks, taskLine } from "./tasks";
import { maybeHandlePlan, rememberTopic, rerenderPlan } from "./plan";

const NO_PERMS = {
  can_send_messages: false, can_send_audios: false, can_send_documents: false, can_send_photos: false,
  can_send_videos: false, can_send_video_notes: false, can_send_voice_notes: false, can_send_polls: false,
  can_send_other_messages: false, can_add_web_page_previews: false, can_change_info: false,
  can_invite_users: false, can_pin_messages: false, can_manage_topics: false,
};
const ALL_PERMS = Object.fromEntries(Object.keys(NO_PERMS).map((k) => [k, !/change_info|pin_messages|manage_topics/.test(k)]));

export async function handleUpdate(c: Ctx, u: any): Promise<void> {
  if (u.message) return onMessage(c, u.message);
  if (u.callback_query) return onCallback(c, u.callback_query);
  if (u.chat_member) return onChatMember(c, u.chat_member);
  if (u.my_chat_member) {
    const ch = u.my_chat_member.chat;
    if (ch.type !== "private") await upsertChat(c, ch);
  }
}

async function upsertChat(c: Ctx, chat: any) {
  await c.db.run(
    "INSERT INTO chats(chat_id, title, is_forum, updated_at) VALUES (?,?,?,?) ON CONFLICT(chat_id) DO UPDATE SET title = excluded.title, is_forum = excluded.is_forum, updated_at = excluded.updated_at",
    chat.id, chat.title ?? "", chat.is_forum ? 1 : 0, Date.now());
}

const appLink = (c: Ctx, chatId: number) => `https://t.me/${c.botUsername}?start=app_${chatId}`;

function isRealReply(msg: any): boolean {
  const r = msg.reply_to_message;
  if (!r) return false;
  if (r.forum_topic_created) return false; // implicit "reply" to the topic header
  if (msg.is_topic_message && r.message_id === msg.message_thread_id) return false;
  return true;
}

// ---------------------------------------------------------------- messages

async function onMessage(c: Ctx, msg: any) {
  const chat = msg.chat;
  if (chat.type === "private") return onPrivate(c, msg);
  if (chat.type !== "group" && chat.type !== "supergroup") return;
  const chatId: number = chat.id;
  const thread: number = msg.is_topic_message ? msg.message_thread_id ?? 0 : 0;
  const now = Date.now();

  const stmts: Array<[string, any[]]> = [[
    "INSERT INTO chats(chat_id, title, is_forum, updated_at) VALUES (?,?,?,?) ON CONFLICT(chat_id) DO UPDATE SET title = excluded.title, is_forum = excluded.is_forum, updated_at = excluded.updated_at",
    [chatId, chat.title ?? "", chat.is_forum ? 1 : 0, now]]];
  if (msg.from && !msg.from.is_bot) stmts.push([
    "INSERT INTO users(user_id, username, uname, first_name, updated_at) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET username = excluded.username, uname = excluded.uname, first_name = excluded.first_name, updated_at = excluded.updated_at",
    [msg.from.id, msg.from.username ?? null, msg.from.username?.toLowerCase() ?? null, userName(msg.from), now]]);
  await c.db.tx(stmts);

  if (msg.new_chat_members) return onJoinMessage(c, msg);
  if (msg.left_chat_member) {
    const s = await c.settings(chatId);
    if (s.clean_service) await c.tg.try("deleteMessage", { chat_id: chatId, message_id: msg.message_id });
    return;
  }

  const topicName = msg.forum_topic_created?.name ?? msg.forum_topic_edited?.name ?? msg.reply_to_message?.forum_topic_created?.name;
  if (topicName && msg.message_thread_id) await rememberTopic(c, chatId, msg.message_thread_id, topicName);

  const text: string = msg.text ?? msg.caption ?? "";
  if (!text && !msg.forward_origin && !msg.sticker && !msg.photo && !msg.video && !msg.document && !msg.animation) return; // other service messages

  const s = await c.settings(chatId);
  let adminP: Promise<boolean> | null = null;
  const isAdmin = () => (adminP ??= c.isAdminMsg(msg));

  if (s.antispam && (await antispam(c, msg, s, thread, isAdmin))) return;

  const isCmd = typeof msg.text === "string" && msg.text.startsWith("/");
  const name = msg.sender_chat ? msg.sender_chat.title ?? "Админ" : userName(msg.from);
  if (text && !isCmd) await recordHistory(c, chatId, thread, msg.from?.id ?? 0, name, text);

  if (isCmd) {
    const m = msg.text.match(/^\/([a-zA-Z0-9_]+)(?:@([A-Za-z0-9_]+))?(?:\s+([\s\S]*))?$/);
    if (!m) return;
    if (m[2] && m[2].toLowerCase() !== c.botUsername.toLowerCase()) return;
    try {
      await groupCommand(c, msg, thread, m[1].toLowerCase(), (m[3] ?? "").trim(), s, isAdmin);
    } catch (e) {
      const d = e instanceof TgError ? e.description : String((e as Error)?.message ?? e);
      console.warn("command failed", m[1], d);
      await c.send(chatId, thread, `⚠️ Не получилось: <code>${esc(d)}</code>`, replyTo(msg));
    }
    return;
  }

  // To-do-like messages become tasks + a checklist in the matching topic.
  const anonAdmin = msg.sender_chat?.id === chatId; // owner posting as the group
  if (s.ai_enabled && text && !msg.forward_origin && (anonAdmin || !msg.from?.is_bot)) {
    try {
      if (await maybeHandlePlan(c, msg, thread, text, anonAdmin ? c.ownerId : msg.from?.id ?? 0, name)) return;
    } catch (e) {
      console.warn("plan failed", String((e as Error)?.message ?? e));
    }
  }

  // LLM replies on @mention or reply to one of the bot's messages
  const mentioned = text.toLowerCase().includes("@" + c.botUsername.toLowerCase());
  let replyToBot = false;
  if (!mentioned && isRealReply(msg)) {
    const r = msg.reply_to_message;
    replyToBot = r.from?.id === c.botId || !!(await c.db.one("SELECT 1 AS x FROM bot_msgs WHERE chat_id = ? AND message_id = ?", chatId, r.message_id));
  }
  if (mentioned || replyToBot) {
    if (!s.ai_enabled) return;
    const question = text.replace(new RegExp("@" + c.botUsername, "ig"), "").trim() || "Привет!";
    await answerWithAI(c, msg, thread, question, name);
  }
}

function replyTo(msg: any) {
  return { reply_parameters: { message_id: msg.message_id, allow_sending_without_reply: true } };
}

async function answerWithAI(c: Ctx, msg: any, thread: number, question: string, asker: string) {
  const chatId = msg.chat.id;
  await c.tg.try("sendChatAction", { chat_id: chatId, action: "typing", ...(thread ? { message_thread_id: thread } : {}) });
  const quoted = isRealReply(msg) ? (msg.reply_to_message.text ?? msg.reply_to_message.caption) : undefined;
  let topicName: string | undefined = msg.reply_to_message?.forum_topic_created?.name;
  let answer: string;
  try {
    answer = await aiReply(c, { chatId, threadId: thread, chatTitle: msg.chat.title ?? "личный чат", topicName, question, askerName: asker, quoted });
  } catch (e) {
    console.warn("AI failed", String((e as Error)?.message ?? e));
    answer = "😔 Сейчас не могу ответить (ИИ недоступен). Попробуйте чуть позже.";
  }
  await c.send(chatId, thread, esc(answer), replyTo(msg));
}

// ---------------------------------------------------------------- anti-spam

async function antispam(c: Ctx, msg: any, s: Settings, thread: number, isAdmin: () => Promise<boolean>): Promise<boolean> {
  const chatId = msg.chat.id;
  const uid = msg.from?.id;
  if (!uid || uid === ANON_ADMIN_BOT || msg.sender_chat?.id === chatId || msg.is_automatic_forward || uid === c.botId) return false;
  const now = Date.now();

  if (s.antiflood) {
    const win = Math.floor(now / 10_000);
    const r = await c.db.one(
      "INSERT INTO flood(chat_id, user_id, win, cnt) VALUES (?,?,?,1) ON CONFLICT(chat_id, user_id) DO UPDATE SET cnt = CASE WHEN win = excluded.win THEN cnt + 1 ELSE 1 END, win = excluded.win RETURNING cnt",
      chatId, uid, win);
    const cnt = Number(r?.cnt ?? 0);
    if (cnt > s.flood_limit && !(await isAdmin())) {
      await c.tg.try("deleteMessage", { chat_id: chatId, message_id: msg.message_id });
      if (cnt === s.flood_limit + 1) {
        await c.tg.try("restrictChatMember", { chat_id: chatId, user_id: uid, permissions: NO_PERMS, use_independent_chat_permissions: true, until_date: Math.floor(now / 1000) + 600 });
        const m = await c.send(chatId, thread, `🌊 ${mentionHtml(uid, userName(msg.from))}, слишком много сообщений подряд. Мут на 10 минут.`);
        if (m) await c.cleanupLater(chatId, m.message_id, 60);
      }
      return true;
    }
  }

  if (s.antilink) {
    const ents = [...(msg.entities ?? []), ...(msg.caption_entities ?? [])];
    const text = msg.text ?? msg.caption ?? "";
    const hasLink = ents.some((e: any) => e.type === "url" || e.type === "text_link") ||
      /(https?:\/\/|www\.|t\.me\/|telegram\.me\/)/i.test(text) ||
      msg.forward_origin?.type === "channel";
    if (hasLink) {
      const mem = await c.db.one("SELECT joined_at FROM members WHERE chat_id = ? AND user_id = ?", chatId, uid);
      const newbie = mem?.joined_at && now - Number(mem.joined_at) < s.newbie_hours * 3_600_000;
      if (newbie && !(await isAdmin())) {
        await c.tg.try("deleteMessage", { chat_id: chatId, message_id: msg.message_id });
        const m = await c.send(chatId, thread, `🔗 ${mentionHtml(uid, userName(msg.from))}, новым участникам нельзя отправлять ссылки и пересылки из каналов первые ${s.newbie_hours} ч.`);
        if (m) await c.cleanupLater(chatId, m.message_id, 30);
        return true;
      }
    }
  }
  return false;
}

// ---------------------------------------------------------------- joins / welcome

async function markJoined(c: Ctx, chatId: number, userId: number): Promise<boolean> {
  const now = Date.now();
  const res = await c.db.tx([
    ["INSERT INTO members(chat_id, user_id, joined_at, warns, welcomed_at) VALUES (?,?,?,0,0) ON CONFLICT(chat_id, user_id) DO UPDATE SET joined_at = excluded.joined_at", [chatId, userId, now]],
    ["UPDATE members SET welcomed_at = ? WHERE chat_id = ? AND user_id = ? AND welcomed_at < ? RETURNING user_id", [now, chatId, userId, now - 120_000]],
  ]);
  return res[1].length > 0; // true => this path should send the welcome
}

async function welcome(c: Ctx, chat: any, users: any[]) {
  const s = await c.settings(chat.id);
  if (!s.welcome_enabled || !users.length) return;
  const names = users.map((u) => mentionHtml(u.id, userName(u))).join(", ");
  const tpl = esc(s.welcome_text || DEFAULT_WELCOME);
  const text = tpl.replace(/\{name\}/g, names).replace(/\{chat\}/g, esc(chat.title ?? ""));
  await c.send(chat.id, 0, text);
}

async function onJoinMessage(c: Ctx, msg: any) {
  const s = await c.settings(msg.chat.id);
  if (s.clean_service) await c.tg.try("deleteMessage", { chat_id: msg.chat.id, message_id: msg.message_id });
  const toWelcome: any[] = [];
  for (const u of msg.new_chat_members) {
    if (u.is_bot) continue;
    if (await markJoined(c, msg.chat.id, u.id)) toWelcome.push(u);
  }
  await welcome(c, msg.chat, toWelcome);
}

async function onChatMember(c: Ctx, cm: any) {
  const was = cm.old_chat_member, now = cm.new_chat_member;
  const wasIn = ["member", "administrator", "creator"].includes(was.status) || (was.status === "restricted" && was.is_member);
  const isIn = ["member", "administrator", "creator"].includes(now.status) || (now.status === "restricted" && now.is_member);
  if (!wasIn && isIn && !now.user.is_bot) {
    await upsertChat(c, cm.chat);
    if (await markJoined(c, cm.chat.id, now.user.id)) await welcome(c, cm.chat, [now.user]);
  }
}

// ---------------------------------------------------------------- private chat

async function onPrivate(c: Ctx, msg: any) {
  const text: string = msg.text ?? "";
  const m = text.match(/^\/([a-zA-Z0-9_]+)(?:@\w+)?(?:\s+([\s\S]*))?$/);
  const cmd = m?.[1]?.toLowerCase();
  const arg = (m?.[2] ?? "").trim();
  if (cmd === "guide" || (cmd === "start" && arg === "guide")) {
    await c.send(msg.chat.id, 0, GUIDE_TEXT, { reply_markup: { inline_keyboard: [[guideWebAppButton(c)]] } }, false);
    return;
  }
  if (cmd === "start" || cmd === "app") {
    const chatParam = arg.match(/^app_(-?\d+)$/)?.[1];
    const url = `${c.env.PUBLIC_URL}/app${chatParam ? `?chat=${chatParam}` : ""}`;
    const intro = cmd === "start" && !chatParam
      ? "👋 Привет! Я <b>Grok Assistant</b> — помощник группы: модерация, списки, задачи с напоминаниями, опросы и ответы ИИ.\n\nНажмите кнопку ниже, чтобы открыть панель управления."
      : "📱 Панель управления группой — нажмите кнопку ниже.";
    await c.send(msg.chat.id, 0, intro, { reply_markup: { inline_keyboard: [[{ text: "📱 Открыть панель", web_app: { url } }], [guideWebAppButton(c)]] } }, false);
    return;
  }
  if (cmd === "help") {
    await c.send(msg.chat.id, 0, helpText(c, true), { reply_markup: { inline_keyboard: [[guideWebAppButton(c)]] } }, false);
    return;
  }
  if (cmd) {
    await c.send(msg.chat.id, 0, "Эта команда работает в группе. Здесь доступны /start, /app, /guide и /help — или просто напишите вопрос.", {}, false);
    return;
  }
  if (text) {
    await recordHistory(c, msg.chat.id, 0, msg.from.id, userName(msg.from), text);
    await answerWithAI(c, msg, 0, text, userName(msg.from));
  }
}

// ---------------------------------------------------------------- help

const GUIDE_TEXT = "📖 <b>Как пользоваться</b>\n\nПодробная инструкция с картинками и анимациями: темы, задачи из списка, кнопки ✅, напоминания, списки, опросы, вопросы боту и Панель. Нажмите кнопку ниже.";

/** web_app buttons are only allowed in private chats. */
function guideWebAppButton(c: Ctx) {
  return { text: "📖 Как пользоваться", web_app: { url: `${c.env.PUBLIC_URL}/app/guide` } };
}

/** In groups: deep link into the registered Mini App; the app opens the guide for start_param=guide. */
function guideUrlButton(c: Ctx) {
  return { text: "📖 Как пользоваться", url: `https://t.me/${c.botUsername}/${GUIDE_APP_SHORT_NAME}?startapp=guide` };
}
const GUIDE_APP_SHORT_NAME = "GrokHelper";

export function helpText(c: Ctx, admin: boolean): string {
  let t = `🤖 <b>Grok Assistant — команды</b>

💬 <b>ИИ</b>: упомяните @${c.botUsername} или ответьте на моё сообщение. /ask вопрос

📋 <b>Списки</b>
/list new Название — новый список
/list add пункт; пункт 2 — добавить (в последний список темы или <code>/list add #id ...</code>)
/list done 2 — отметить пункт №2
/list show — показать · /list del — удалить · /lists — все списки

📊 <b>Опросы</b>
/poll Вопрос | вариант 1 | вариант 2
флаги: <code>-m</code> несколько ответов, <code>-p</code> публичный (не анонимный)

🗂 <b>Задачи</b>
/task Текст [@user] [когда] — например <code>/task Позвонить @ivan завтра 10:00</code>
когда: «через 2 часа», «сегодня 18:30», «в пятницу», «25.10 15:00»
/tasks — открытые · /tasks мои · /done 5 — выполнено

📱 /app — панель управления (Mini App)
📖 /guide — подробная инструкция с картинками`;
  if (admin) t += `

🛡 <b>Админам</b> (ответом на сообщение или @username/ID)
/ban · /unban · /mute [30m|2h|1d] · /unmute
/warn [причина] (3 предупреждения → мут на сутки) · /unwarn · /warns
/del — удалить сообщение
/topic create Имя · /topic close · /topic reopen · /topic rename Имя
/settings — настройки · /antispam on|off|links|flood N|newbie N
/welcome текст ({name}, {chat}) | on | off`;
  return t;
}

// ---------------------------------------------------------------- commands

const ADMIN_CMDS = new Set(["ban", "unban", "mute", "unmute", "warn", "unwarn", "del", "topic", "settings", "antispam", "welcome"]);

async function resolveTarget(c: Ctx, msg: any, args: string): Promise<{ id: number; name: string; rest: string; senderChat?: any } | null> {
  if (isRealReply(msg)) {
    const r = msg.reply_to_message;
    if (r.sender_chat && r.sender_chat.id !== msg.chat.id) return { id: r.sender_chat.id, name: r.sender_chat.title ?? "канал", rest: args, senderChat: r.sender_chat };
    if (r.from) return { id: r.from.id, name: userName(r.from), rest: args };
  }
  for (const e of msg.entities ?? []) {
    if (e.type === "text_mention" && e.user) {
      const label = msg.text.substr(e.offset, e.length);
      return { id: e.user.id, name: userName(e.user), rest: args.replace(label, "").trim() };
    }
  }
  const [tok, ...more] = args.split(/\s+/);
  if (/^\d{5,}$/.test(tok ?? "")) return { id: Number(tok), name: tok, rest: more.join(" ") };
  const um = tok?.match(/^@([A-Za-z0-9_]{4,32})$/);
  if (um) {
    const row = await c.db.one("SELECT user_id, first_name FROM users WHERE uname = ?", um[1].toLowerCase());
    if (row) return { id: Number(row.user_id), name: row.first_name || "@" + um[1], rest: more.join(" ") };
    throw new Error(`не знаю пользователя @${um[1]} — ответьте на его сообщение`);
  }
  return null;
}

async function groupCommand(c: Ctx, msg: any, thread: number, cmd: string, args: string, s: Settings, isAdmin: () => Promise<boolean>) {
  const chatId = msg.chat.id;
  const reply = (text: string, extra: Record<string, unknown> = {}) => c.send(chatId, thread, text, { ...replyTo(msg), ...extra });
  const fromId: number = msg.sender_chat?.id === chatId ? 0 : msg.from?.id ?? 0;
  const fromName = msg.sender_chat?.id === chatId ? "Админ" : userName(msg.from);

  if (ADMIN_CMDS.has(cmd) && !(await isAdmin())) {
    const m = await reply("⛔ Эта команда только для администраторов.");
    if (m) await c.cleanupLater(chatId, m.message_id, 20);
    return;
  }

  switch (cmd) {
    case "start":
    case "help":
      await reply(helpText(c, await isAdmin()), { reply_markup: { inline_keyboard: [[guideUrlButton(c)]] } });
      return;

    case "guide":
      await reply(GUIDE_TEXT, { reply_markup: { inline_keyboard: [[guideUrlButton(c)]] } });
      return;

    case "ask": {
      if (!args && !isRealReply(msg)) { await reply("Напишите вопрос: <code>/ask Как дела?</code>"); return; }
      if (!s.ai_enabled) { await reply("ИИ-ответы отключены в /settings."); return; }
      await recordHistory(c, chatId, thread, fromId, fromName, args);
      await answerWithAI(c, msg, thread, args || "Прокомментируй это сообщение", fromName);
      return;
    }

    // ---------------- moderation
    case "ban": case "unban": case "mute": case "unmute": case "warn": case "unwarn": {
      const t = await resolveTarget(c, msg, args);
      if (!t) { await reply(`Ответьте на сообщение пользователя или укажите @username / ID: <code>/${cmd} @user</code>`); return; }
      if (t.id === c.botId || t.id === ANON_ADMIN_BOT || t.id === chatId) { await reply("🙃 Не могу применить это к себе или к анонимному админу."); return; }
      if (!t.senderChat && ["ban", "mute", "warn"].includes(cmd) && (await c.isAdminUser(chatId, t.id))) { await reply("⛔ Нельзя применить к администратору."); return; }
      const who = t.senderChat ? `<b>${esc(t.name)}</b>` : mentionHtml(t.id, t.name);
      if (cmd === "ban") {
        if (t.senderChat) await c.tg.call("banChatSenderChat", { chat_id: chatId, sender_chat_id: t.id });
        else await c.tg.call("banChatMember", { chat_id: chatId, user_id: t.id });
        await reply(`🚫 ${who} забанен(а).${t.rest ? " Причина: " + esc(t.rest) : ""}`);
      } else if (cmd === "unban") {
        if (t.senderChat) await c.tg.call("unbanChatSenderChat", { chat_id: chatId, sender_chat_id: t.id });
        else await c.tg.call("unbanChatMember", { chat_id: chatId, user_id: t.id, only_if_banned: true });
        await reply(`✅ ${who} разбанен(а).`);
      } else if (cmd === "mute") {
        const [d, ...rest] = t.rest.split(/\s+/);
        const dur = parseDuration(d);
        const reason = (dur ? rest.join(" ") : t.rest).trim();
        await c.tg.call("restrictChatMember", { chat_id: chatId, user_id: t.id, permissions: NO_PERMS, use_independent_chat_permissions: true, ...(dur ? { until_date: Math.floor(Date.now() / 1000) + dur } : {}) });
        await reply(`🔇 ${who} в муте ${dur ? "на " + humanDuration(dur) : "до снятия"}.${reason ? " Причина: " + esc(reason) : ""}`);
      } else if (cmd === "unmute") {
        const info = await c.tg.try("getChat", { chat_id: chatId });
        await c.tg.call("restrictChatMember", { chat_id: chatId, user_id: t.id, permissions: info?.permissions ?? ALL_PERMS, use_independent_chat_permissions: true });
        await reply(`🔊 ${who} может снова писать.`);
      } else if (cmd === "warn") {
        const r = await c.db.one(
          "INSERT INTO members(chat_id, user_id, joined_at, warns) VALUES (?,?,NULL,1) ON CONFLICT(chat_id, user_id) DO UPDATE SET warns = warns + 1 RETURNING warns",
          chatId, t.id);
        const n = Number(r?.warns ?? 1);
        const limit = s.warn_limit || 3;
        if (n >= limit) {
          await c.tg.call("restrictChatMember", { chat_id: chatId, user_id: t.id, permissions: NO_PERMS, use_independent_chat_permissions: true, until_date: Math.floor(Date.now() / 1000) + 86400 });
          await c.db.run("UPDATE members SET warns = 0 WHERE chat_id = ? AND user_id = ?", chatId, t.id);
          await reply(`⚠️ ${who}: предупреждение ${n}/${limit}. 🔇 Мут на 24 часа.${t.rest ? "\nПричина: " + esc(t.rest) : ""}`);
        } else {
          await reply(`⚠️ ${who}: предупреждение ${n}/${limit}.${t.rest ? "\nПричина: " + esc(t.rest) : ""}`);
        }
      } else if (cmd === "unwarn") {
        const r = await c.db.one("UPDATE members SET warns = MAX(0, warns - 1) WHERE chat_id = ? AND user_id = ? RETURNING warns", chatId, t.id);
        await reply(`↩️ ${who}: предупреждений ${Number(r?.warns ?? 0)}/${s.warn_limit || 3}.`);
      }
      return;
    }

    case "warns": {
      let id = fromId, name = fromName;
      if (args || isRealReply(msg)) {
        const t = await resolveTarget(c, msg, args).catch(() => null);
        if (t) { id = t.id; name = t.name; }
      }
      const r = await c.db.one("SELECT warns FROM members WHERE chat_id = ? AND user_id = ?", chatId, id);
      await reply(`⚠️ ${mentionHtml(id, name)}: предупреждений ${Number(r?.warns ?? 0)}/${s.warn_limit || 3}.`);
      return;
    }

    case "del": {
      if (!isRealReply(msg)) { await reply("Ответьте командой /del на сообщение, которое нужно удалить."); return; }
      await c.tg.call("deleteMessage", { chat_id: chatId, message_id: msg.reply_to_message.message_id });
      await c.tg.try("deleteMessage", { chat_id: chatId, message_id: msg.message_id });
      return;
    }

    // ---------------- topics
    case "topic": {
      if (!msg.chat.is_forum) { await reply("В этой группе не включены темы."); return; }
      const [sub0, ...restArr] = args.split(/\s+/);
      const sub = (sub0 ?? "").toLowerCase();
      const rest = restArr.join(" ").trim();
      if (["create", "new", "создать", "новая"].includes(sub)) {
        if (!rest) { await reply("Укажите название: <code>/topic create Название</code>"); return; }
        const t = await c.tg.call("createForumTopic", { chat_id: chatId, name: rest.slice(0, 128) });
        await c.send(chatId, t.message_thread_id, `🧵 Тема «${esc(t.name)}» создана. Пишите здесь!`);
        const link = `https://t.me/c/${String(chatId).replace(/^-100/, "")}/${t.message_thread_id}`;
        await reply(`✅ Тема создана: <a href="${link}">${esc(t.name)}</a>`);
      } else if (["close", "закрыть"].includes(sub)) {
        if (thread) await c.tg.call("closeForumTopic", { chat_id: chatId, message_thread_id: thread });
        else await c.tg.call("closeGeneralForumTopic", { chat_id: chatId });
        await reply("🔒 Тема закрыта.");
      } else if (["reopen", "open", "открыть"].includes(sub)) {
        if (thread) await c.tg.call("reopenForumTopic", { chat_id: chatId, message_thread_id: thread });
        else await c.tg.call("reopenGeneralForumTopic", { chat_id: chatId });
        await reply("🔓 Тема снова открыта.");
      } else if (["rename", "переименовать"].includes(sub)) {
        if (!rest) { await reply("Укажите новое название: <code>/topic rename Название</code>"); return; }
        if (thread) await c.tg.call("editForumTopic", { chat_id: chatId, message_thread_id: thread, name: rest.slice(0, 128) });
        else await c.tg.call("editGeneralForumTopic", { chat_id: chatId, name: rest.slice(0, 128) });
        await reply(`✏️ Тема переименована: «${esc(rest)}».`);
      } else {
        await reply("Использование:\n/topic create Название\n/topic close\n/topic reopen\n/topic rename Название");
      }
      return;
    }

    // ---------------- settings
    case "settings": {
      const r = renderSettings(c, s);
      await reply(r.text, { reply_markup: r.reply_markup });
      return;
    }
    case "antispam": {
      const [a, b] = args.toLowerCase().split(/\s+/);
      const on = (v?: string) => (v === "off" || v === "выкл" || v === "0" ? 0 : 1);
      if (a === "on" || a === "вкл") await setSetting(c, chatId, "antispam", 1);
      else if (a === "off" || a === "выкл") await setSetting(c, chatId, "antispam", 0);
      else if (a === "links" || a === "ссылки") await setSetting(c, chatId, "antilink", on(b));
      else if (a === "flood" || a === "флуд") {
        if (b && /^\d+$/.test(b)) { await setSetting(c, chatId, "flood_limit", Math.max(2, Math.min(50, Number(b)))); await setSetting(c, chatId, "antiflood", 1); }
        else await setSetting(c, chatId, "antiflood", on(b));
      } else if ((a === "newbie" || a === "новички") && b && /^\d+$/.test(b)) await setSetting(c, chatId, "newbie_hours", Math.min(720, Number(b)));
      else if (a) { await reply("Использование: /antispam on|off · links on|off · flood on|off|N · newbie N(часов)"); return; }
      const r = renderSettings(c, await c.settings(chatId));
      await reply(r.text, { reply_markup: r.reply_markup });
      return;
    }
    case "welcome": {
      if (!args) {
        await reply(`👋 Приветствие ${s.welcome_enabled ? "включено" : "выключено"}:\n\n${esc(s.welcome_text || DEFAULT_WELCOME)}\n\nИзменить: <code>/welcome текст</code> ({name}, {chat}) · <code>/welcome off</code>`);
        return;
      }
      if (/^(off|выкл)$/i.test(args)) await setSetting(c, chatId, "welcome_enabled", 0);
      else if (/^(on|вкл)$/i.test(args)) await setSetting(c, chatId, "welcome_enabled", 1);
      else { await c.db.run("UPDATE settings SET welcome_text = ?, welcome_enabled = 1 WHERE chat_id = ?", args.slice(0, 1000), chatId); }
      await reply("✅ Приветствие обновлено.");
      return;
    }

    // ---------------- lists
    case "list": {
      const sm = args.match(/^(\S+)\s*([\s\S]*)$/);
      const sub = (sm?.[1] ?? "").toLowerCase();
      const rest = (sm?.[2] ?? "").trim();
      if (["new", "create", "новый", "создать"].includes(sub)) {
        if (!rest) { await reply("Укажите название: <code>/list new Покупки</code>"); return; }
        const [nameLine, ...itemLines] = rest.split("\n");
        const id = await createList(c, chatId, thread, nameLine.trim(), fromId);
        const items = itemLines.map((x) => x.replace(/^[-•*\d.)\s]+/, "").trim()).filter(Boolean);
        if (items.length) await addItems(c, id, items, fromId);
        await repostList(c, id);
        return;
      }
      if (["add", "добавить", "+"].includes(sub)) {
        const { list, rest: r2 } = await resolveList(c, chatId, thread, rest);
        if (!list) { await reply("Сначала создайте список: <code>/list new Название</code>"); return; }
        const items = r2.split(/\n|;/).map((x) => x.replace(/^[-•*\s]+/, "").trim()).filter(Boolean);
        if (!items.length) { await reply("Что добавить? <code>/list add молоко; хлеб</code>"); return; }
        await addItems(c, Number(list.id), items, fromId);
        await repostList(c, Number(list.id));
        await c.tg.try("deleteMessage", { chat_id: chatId, message_id: msg.message_id });
        return;
      }
      if (["done", "check", "готово", "отметить", "toggle"].includes(sub)) {
        const { list, rest: r2 } = await resolveList(c, chatId, thread, rest);
        if (!list) { await reply("Списков пока нет."); return; }
        const items = await listItems(c, Number(list.id));
        const nums = (r2.match(/\d+/g) ?? []).map(Number);
        if (!nums.length) { await reply("Укажите номер пункта: <code>/list done 2</code>"); return; }
        for (const n of nums) if (items[n - 1]) await toggleItem(c, Number(items[n - 1].id));
        await repostList(c, Number(list.id));
        await c.tg.try("deleteMessage", { chat_id: chatId, message_id: msg.message_id });
        return;
      }
      if (["del", "delete", "удалить", "rm"].includes(sub)) {
        const { list } = await resolveList(c, chatId, thread, rest);
        if (!list) { await reply("Список не найден."); return; }
        if (Number(list.created_by) !== fromId && !(await isAdmin())) { await reply("⛔ Удалить список может автор или админ."); return; }
        if (list.message_id) await c.tg.try("deleteMessage", { chat_id: chatId, message_id: list.message_id });
        await c.db.tx([["DELETE FROM list_items WHERE list_id = ?", [list.id]], ["DELETE FROM lists WHERE id = ?", [list.id]]]);
        await reply(`🗑 Список «${esc(list.name)}» удалён.`);
        return;
      }
      // show (default)
      const { list } = await resolveList(c, chatId, thread, ["show", "показать"].includes(sub) ? rest : args);
      if (!list) { await reply("Списков пока нет. Создайте: <code>/list new Покупки</code>"); return; }
      await repostList(c, Number(list.id));
      return;
    }
    case "lists": {
      const rows = await c.db.all(
        "SELECT l.id, l.name, (SELECT COUNT(*) FROM list_items i WHERE i.list_id = l.id) AS total, (SELECT COUNT(*) FROM list_items i WHERE i.list_id = l.id AND i.done = 1) AS done FROM lists l WHERE l.chat_id = ? ORDER BY l.id DESC LIMIT 30", chatId);
      if (!rows.length) { await reply("Списков пока нет. Создайте: <code>/list new Покупки</code>"); return; }
      await reply("📋 <b>Списки</b>\n\n" + rows.map((r) => `<b>#${r.id}</b> ${esc(r.name)} — ${r.done}/${r.total}`).join("\n") + "\n\nПоказать: <code>/list show #id</code>");
      return;
    }

    // ---------------- polls
    case "poll": {
      let a = args, multi = false, pub = false;
      for (;;) {
        const f = a.match(/^(-m|-multi|-м|-p|-public|-п)(\s+|$)/i);
        if (!f) break;
        if (/^-(m|multi|м)$/i.test(f[1])) multi = true; else pub = true;
        a = a.slice(f[0].length);
      }
      const parts = (a.includes("|") ? a.split("|") : a.split("\n")).map((x) => x.trim()).filter(Boolean);
      if (parts.length < 3) {
        await reply("Использование: <code>/poll Вопрос | вариант 1 | вариант 2</code>\nФлаги: <code>-m</code> — несколько ответов, <code>-p</code> — публичный опрос.\nПример: <code>/poll -m Куда идём? | Кино | Парк | Кафе</code>");
        return;
      }
      const [q, ...opts] = parts;
      await c.tg.call("sendPoll", {
        chat_id: chatId, ...(thread ? { message_thread_id: thread } : {}),
        question: q.slice(0, 300), options: opts.slice(0, 10).map((t) => ({ text: t.slice(0, 100) })),
        is_anonymous: !pub, allows_multiple_answers: multi,
      });
      await c.tg.try("deleteMessage", { chat_id: chatId, message_id: msg.message_id });
      return;
    }

    // ---------------- tasks
    case "task": {
      if (!args) { await reply("Использование: <code>/task Текст [@user] [когда]</code>\nНапример: <code>/task Оплатить хостинг @ivan завтра 10:00</code>"); return; }
      let rest = args;
      let assigneeId: number | null = null, assigneeName: string | null = null;
      if (isRealReply(msg) && msg.reply_to_message.from && !msg.reply_to_message.from.is_bot) {
        assigneeId = msg.reply_to_message.from.id; assigneeName = userName(msg.reply_to_message.from);
      }
      for (const e of msg.entities ?? []) {
        if (e.type === "text_mention" && e.user) {
          const label = msg.text.substr(e.offset, e.length);
          assigneeId = e.user.id; assigneeName = userName(e.user); rest = rest.replace(label, " ");
        }
      }
      const um = rest.match(/(^|\s)@([A-Za-z0-9_]{4,32})\b/);
      if (um && um[2].toLowerCase() !== c.botUsername.toLowerCase()) {
        const row = await c.db.one("SELECT user_id, first_name FROM users WHERE uname = ?", um[2].toLowerCase());
        assigneeId = row ? Number(row.user_id) : null;
        assigneeName = row?.first_name ? String(row.first_name) : "@" + um[2];
        rest = rest.replace(um[0], " ");
      }
      const { due, rest: textOnly } = parseWhen(rest, c.tz);
      if (!textOnly) { await reply("Добавьте описание задачи."); return; }
      const t = await createTask(c, { chatId, threadId: thread, text: textOnly, assigneeId, assigneeName, createdBy: fromId, creatorName: fromName, due });
      let out = `📝 Задача <b>#${t.id}</b> создана:\n${esc(textOnly)}`;
      if (assigneeName) out += `\n👤 ${assigneeId ? mentionHtml(assigneeId, assigneeName) : esc(assigneeName)}`;
      if (due) out += `\n⏰ ${fmtDate(due, c.tz, true)} (Киев)${due < Date.now() ? " — время уже прошло, напомню сразу" : ""}`;
      await reply(out, { reply_markup: { inline_keyboard: [[{ text: "✅ Выполнено", callback_data: `td:${t.id}:r` }]] } });
      return;
    }
    case "tasks": {
      const mine = /^(мои|my|me|mine)$/i.test(args);
      const r = await renderTasks(c, chatId, mine ? fromId : undefined);
      await reply(r.text, r.reply_markup ? { reply_markup: r.reply_markup } : {});
      return;
    }
    case "done": {
      const id = Number(args.match(/\d+/)?.[0]);
      if (!id) { await reply("Укажите номер задачи: <code>/done 5</code>"); return; }
      const t = await c.db.one("SELECT * FROM tasks WHERE id = ? AND chat_id = ?", id, chatId);
      if (!t) { await reply("Задача не найдена."); return; }
      if (![Number(t.assignee_id), Number(t.created_by)].includes(fromId) && !(await isAdmin())) { await reply("⛔ Отметить может исполнитель, автор или админ."); return; }
      await c.db.run("UPDATE tasks SET done = 1, done_at = ? WHERE id = ?", Date.now(), id);
      await reply(`✅ Задача <b>#${id}</b> выполнена: ${esc(t.text)}`);
      return;
    }

    case "app": {
      await reply("📱 Панель управления: списки, задачи, напоминания и настройки чата.", {
        reply_markup: { inline_keyboard: [[{ text: "📱 Открыть панель", url: appLink(c, chatId) }]] },
      });
      return;
    }
    default:
      return; // unknown command: stay silent
  }
}

// ---------------------------------------------------------------- settings UI

const TOGGLES: Array<[keyof Settings, string]> = [
  ["antispam", "🛡 Антиспам"], ["antilink", "🔗 Ссылки от новичков"], ["antiflood", "🌊 Антифлуд"],
  ["welcome_enabled", "👋 Приветствие"], ["clean_service", "🧹 Удалять «вошёл/вышел»"], ["ai_enabled", "🤖 Ответы ИИ"],
];

async function setSetting(c: Ctx, chatId: number, field: string, value: number) {
  const allowed = ["antispam", "antilink", "antiflood", "flood_limit", "newbie_hours", "welcome_enabled", "clean_service", "ai_enabled", "warn_limit"];
  if (!allowed.includes(field)) throw new Error("bad field");
  await c.settings(chatId);
  await c.db.run(`UPDATE settings SET ${field} = ? WHERE chat_id = ?`, value, chatId);
}

function renderSettings(c: Ctx, s: Settings) {
  const on = (v: number) => (v ? "✅" : "❌");
  const text = `⚙️ <b>Настройки чата</b>

${TOGGLES.map(([k, label]) => `${on(s[k] as number)} ${label}`).join("\n")}

🌊 Лимит флуда: ${s.flood_limit} сообщений / 10 сек
🐣 «Новичок» первые ${s.newbie_hours} ч.
⚠️ Предупреждений до мута: ${s.warn_limit}

Текст приветствия — /welcome. Больше настроек — в панели.`;
  const kb: any[][] = [];
  for (let i = 0; i < TOGGLES.length; i += 2) {
    kb.push(TOGGLES.slice(i, i + 2).map(([k, label]) => ({ text: `${on(s[k] as number)} ${label.replace(/^\S+\s/, "")}`, callback_data: `st:${k}` })));
  }
  kb.push([{ text: "📱 Открыть панель", url: appLink(c, s.chat_id) }]);
  return { text, reply_markup: { inline_keyboard: kb } };
}

// ---------------------------------------------------------------- callbacks

async function onCallback(c: Ctx, cq: any) {
  const data: string = cq.data ?? "";
  const msg = cq.message;
  const answer = (text?: string, alert = false) => c.tg.try("answerCallbackQuery", { callback_query_id: cq.id, text, show_alert: alert });
  if (!msg) return void (await answer());
  const chatId = msg.chat.id;
  const [kind, idStr, extra] = data.split(":");
  const id = Number(idStr);

  try {
    if (kind === "lt") {
      const item = await c.db.one("SELECT i.*, l.chat_id FROM list_items i JOIN lists l ON l.id = i.list_id WHERE i.id = ?", id);
      if (!item || Number(item.chat_id) !== chatId) return void (await answer("Пункт не найден"));
      const it = await toggleItem(c, id);
      const list = await getList(c, Number(item.list_id));
      const r = renderList(list!, await listItems(c, Number(item.list_id)));
      await c.tg.try("editMessageText", { chat_id: chatId, message_id: msg.message_id, text: r.text, parse_mode: "HTML", reply_markup: r.reply_markup });
      if (Number(list!.message_id) !== msg.message_id) await c.db.run("UPDATE lists SET message_id = ? WHERE id = ?", msg.message_id, list!.id);
      return void (await answer(it?.done ? "✅ Отмечено" : "⬜ Снято"));
    }
    if (kind === "lr") {
      const list = await getList(c, id);
      if (!list || Number(list.chat_id) !== chatId) return void (await answer("Список не найден"));
      const r = renderList(list, await listItems(c, id));
      await c.tg.try("editMessageText", { chat_id: chatId, message_id: msg.message_id, text: r.text, parse_mode: "HTML", reply_markup: r.reply_markup });
      return void (await answer("Обновлено"));
    }
    if (kind === "td" || kind === "ts") {
      const t = await c.db.one("SELECT * FROM tasks WHERE id = ?", id);
      if (!t || Number(t.chat_id) !== chatId) return void (await answer("Задача не найдена"));
      const allowed = [Number(t.assignee_id), Number(t.created_by)].includes(cq.from.id) || (await c.isAdminUser(chatId, cq.from.id));
      if (!allowed) return void (await answer("Это может сделать исполнитель, автор или админ", true));
      if (kind === "td") {
        await c.db.run("UPDATE tasks SET done = 1, done_at = ? WHERE id = ?", Date.now(), id);
        if (extra === "p" && t.src_msg_id) {
          await rerenderPlan(c, chatId, msg.message_id, Number(t.src_msg_id), msg.text ?? "");
        } else if (extra === "l") {
          const r = await renderTasks(c, chatId);
          await c.tg.try("editMessageText", { chat_id: chatId, message_id: msg.message_id, text: r.text, parse_mode: "HTML", reply_markup: r.reply_markup ?? { inline_keyboard: [] } });
        } else {
          await c.tg.try("editMessageText", { chat_id: chatId, message_id: msg.message_id, parse_mode: "HTML", text: `${taskLine(c, { ...t, done: 1 })}\n\n✅ Выполнено — ${esc(userName(cq.from))}`, reply_markup: { inline_keyboard: [] } });
        }
        return void (await answer("✅ Задача выполнена"));
      }
      const minutes = Math.min(Number(extra) || 60, 10080);
      const due = Date.now() + minutes * 60_000;
      await c.db.run("UPDATE tasks SET due_at = ?, remind_at = NULL, reminded = 0 WHERE id = ?", due, id);
      await c.tg.try("editMessageText", { chat_id: chatId, message_id: msg.message_id, parse_mode: "HTML", text: `${taskLine(c, { ...t, due_at: due })}\n\n⏰ Отложено до ${fmtDate(due, c.tz)} — ${esc(userName(cq.from))}`, reply_markup: reminderMarkup(id) });
      return void (await answer(`Напомню ${fmtDate(due, c.tz)}`));
    }
    if (kind === "st") {
      if (!(await c.isAdminUser(chatId, cq.from.id))) return void (await answer("Только для администраторов", true));
      const field = idStr as keyof Settings;
      if (!TOGGLES.some(([k]) => k === field)) return void (await answer());
      const s = await c.settings(chatId);
      await setSetting(c, chatId, field, s[field] ? 0 : 1);
      const r = renderSettings(c, await c.settings(chatId));
      await c.tg.try("editMessageText", { chat_id: chatId, message_id: msg.message_id, text: r.text, parse_mode: "HTML", reply_markup: r.reply_markup });
      return void (await answer("Сохранено"));
    }
    await answer();
  } catch (e) {
    console.warn("callback failed", String((e as Error)?.message ?? e));
    await answer("Ошибка, попробуйте ещё раз");
  }
}

export { truncate };
