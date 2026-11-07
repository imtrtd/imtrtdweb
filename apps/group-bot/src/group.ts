import { Ctx, DEFAULT_WELCOME, Settings } from "./env";
import { esc, mentionHtml, truncate, userName } from "./tg";

const FULL_PERMS = {
  can_send_messages: true, can_send_audios: true, can_send_documents: true, can_send_photos: true, can_send_videos: true,
  can_send_video_notes: true, can_send_voice_notes: true, can_send_polls: true, can_send_other_messages: true,
  can_add_web_page_previews: true, can_invite_users: true, can_change_info: true, can_pin_messages: true, can_manage_topics: true,
};
const NO_PERMS = Object.fromEntries(Object.keys(FULL_PERMS).map((k) => [k, false]));
/** Newbie: text only, no media / stickers / previews. */
const TEXT_ONLY = { ...NO_PERMS, can_send_messages: true };

const nowSec = () => Math.floor(Date.now() / 1000);
const onOff = (v: number) => (v ? "вкл ✅" : "выкл ❌");

async function restrict(c: Ctx, chatId: number, userId: number, permissions: Record<string, boolean>, untilSec = 0) {
  return c.tg.try("restrictChatMember", { chat_id: chatId, user_id: userId, permissions, use_independent_chat_permissions: true, until_date: untilSec });
}

export async function muteUser(c: Ctx, chatId: number, userId: number, minutes: number) {
  return restrict(c, chatId, userId, NO_PERMS, nowSec() + Math.max(1, minutes) * 60);
}

/** Lift restrictions, keeping the newbie text-only window if it is still running. */
async function liftToNewbie(c: Ctx, chatId: number, userId: number, s: Settings) {
  const m = await c.db.one<any>("SELECT joined_at FROM members WHERE chat_id = ? AND user_id = ?", chatId, userId);
  const until = Math.floor(((m?.joined_at ?? 0) + s.newbie_min * 60_000) / 1000);
  if (s.newbie_min > 0 && until - nowSec() > 40) return restrict(c, chatId, userId, TEXT_ONLY, until);
  return restrict(c, chatId, userId, FULL_PERMS);
}

function renderWelcome(s: Settings, user: any, chat: any) {
  const tpl = s.welcome_text || DEFAULT_WELCOME;
  return esc(tpl).replace(/\{name\}/g, mentionHtml(user.id, userName(user))).replace(/\{chat\}/g, esc(chat.title ?? ""))
    .replace(/\{username\}/g, user.username ? "@" + esc(user.username) : esc(userName(user)));
}

async function sendWelcome(c: Ctx, chat: any, user: any, s: Settings) {
  if (!s.welcome_enabled) return;
  const m = await c.send(chat.id, renderWelcome(s, user, chat));
  if (m) await c.cleanupLater(chat.id, m.message_id, 600);
}

/* ---------------- joins / leaves ---------------- */

export async function onNewMembers(c: Ctx, msg: any) {
  const chat = msg.chat;
  const s = await c.settings(chat.id);
  if (chat.title && chat.title !== s.title) await c.db.run("UPDATE settings SET title = ? WHERE chat_id = ?", chat.title, chat.id);
  if (s.clean_service) await c.tg.try("deleteMessage", { chat_id: chat.id, message_id: msg.message_id });
  for (const u of msg.new_chat_members ?? []) {
    if (u.id === c.botId) {
      await c.send(chat.id, "👋 Привет! Я <b>IMTRTD Group Automation</b>: приветствие, правила, капча, антиспам, модерация и напоминания.\n\nДайте мне права администратора (удаление сообщений, блокировка участников), затем админы могут настроить меня — /help, /settings.");
      continue;
    }
    if (u.is_bot) continue;
    await c.db.run("INSERT INTO members(chat_id, user_id, joined_at, warns) VALUES (?,?,?,0) ON CONFLICT(chat_id, user_id) DO UPDATE SET joined_at = excluded.joined_at",
      chat.id, u.id, Date.now());
    // If an admin added the user, skip captcha.
    const addedByAdmin = msg.from && msg.from.id !== u.id && (await c.isAdminUser(chat.id, msg.from.id));
    if (s.captcha && !addedByAdmin) {
      await restrict(c, chat.id, u.id, NO_PERMS);
      const sec = Math.max(30, s.captcha_sec);
      const m = await c.send(chat.id,
        `${mentionHtml(u.id, userName(u))}, добро пожаловать! Чтобы писать в чат, нажмите кнопку ниже в течение ${Math.round(sec / 60) || 1} мин. Иначе вы будете удалены из группы.`,
        { reply_markup: { inline_keyboard: [[{ text: "🤖 Я не бот", callback_data: `cap:${u.id}` }]] } });
      await c.db.run("INSERT OR REPLACE INTO captcha(chat_id, user_id, message_id, deadline, name) VALUES (?,?,?,?,?)",
        chat.id, u.id, m?.message_id ?? 0, Date.now() + sec * 1000, userName(u));
    } else {
      if (s.newbie_min > 0) await restrict(c, chat.id, u.id, TEXT_ONLY, nowSec() + s.newbie_min * 60);
      await sendWelcome(c, chat, u, s);
    }
  }
}

export async function onLeft(c: Ctx, msg: any) {
  const s = await c.settings(msg.chat.id);
  if (s.clean_service) await c.tg.try("deleteMessage", { chat_id: msg.chat.id, message_id: msg.message_id });
  if (msg.left_chat_member) await c.db.run("DELETE FROM captcha WHERE chat_id = ? AND user_id = ?", msg.chat.id, msg.left_chat_member.id);
}

export async function onCaptchaButton(c: Ctx, cq: any) {
  const target = Number(String(cq.data).split(":")[1]);
  const chat = cq.message?.chat;
  if (!chat) return c.tg.try("answerCallbackQuery", { callback_query_id: cq.id });
  if (cq.from.id !== target) return c.tg.try("answerCallbackQuery", { callback_query_id: cq.id, text: "Эта кнопка не для вас 🙂", show_alert: false });
  const row = await c.db.one<any>("SELECT * FROM captcha WHERE chat_id = ? AND user_id = ?", chat.id, target);
  if (!row) return c.tg.try("answerCallbackQuery", { callback_query_id: cq.id, text: "Проверка уже не активна." });
  await c.db.run("DELETE FROM captcha WHERE chat_id = ? AND user_id = ?", chat.id, target);
  const s = await c.settings(chat.id);
  await liftToNewbie(c, chat.id, target, s);
  await c.tg.try("answerCallbackQuery", { callback_query_id: cq.id, text: "Спасибо! Проверка пройдена ✅" });
  await c.tg.try("deleteMessage", { chat_id: chat.id, message_id: cq.message.message_id });
  await sendWelcome(c, chat, cq.from, s);
}

/** Cron: kick users who did not pass the captcha in time. */
export async function expireCaptchas(c: Ctx) {
  const rows = await c.db.all<any>("SELECT * FROM captcha WHERE deadline <= ? LIMIT 30", Date.now());
  for (const r of rows) {
    await c.db.run("DELETE FROM captcha WHERE chat_id = ? AND user_id = ?", r.chat_id, r.user_id);
    if (r.message_id) await c.tg.try("deleteMessage", { chat_id: r.chat_id, message_id: r.message_id });
    // Kick = ban for a short time (user can rejoin later).
    const ok = await c.tg.try("banChatMember", { chat_id: r.chat_id, user_id: r.user_id, until_date: nowSec() + 60 });
    if (ok) {
      await c.tg.try("unbanChatMember", { chat_id: r.chat_id, user_id: r.user_id, only_if_banned: true });
      const m = await c.send(r.chat_id, `🚪 ${esc(r.name)} не прошёл(ла) проверку «Я не бот» и удалён(а) из группы.`);
      if (m) await c.cleanupLater(r.chat_id, m.message_id, 60);
    }
  }
}

/* ---------------- antispam ---------------- */

const LINK_RE = /(https?:\/\/|www\.|\bt\.me\/|\btelegram\.(me|dog)\/|\b[a-z0-9-]{2,}\.(com|ru|net|org|io|me|xyz|info|top|site|online|shop|link|ly|gg|ua|de|biz|app|club)\b)/i;

function hasLink(msg: any): boolean {
  const ents = [...(msg.entities ?? []), ...(msg.caption_entities ?? [])];
  if (ents.some((e: any) => e.type === "url" || e.type === "text_link")) return true;
  if (msg.reply_markup?.inline_keyboard) return true;
  return LINK_RE.test(String(msg.text ?? msg.caption ?? ""));
}

async function notice(c: Ctx, chatId: number, text: string, sec = 30) {
  const m = await c.send(chatId, text);
  if (m) await c.cleanupLater(chatId, m.message_id, sec);
}

/** Returns true if the message was removed / the user punished (stop processing). */
export async function antispam(c: Ctx, msg: any, edited = false): Promise<boolean> {
  const chatId = msg.chat.id;
  const u = msg.from;
  if (!u || u.is_bot || msg.sender_chat?.id === chatId) return false;
  if (await c.isAdminMsg(msg)) return false;
  const s = await c.settings(chatId);
  const who = mentionHtml(u.id, userName(u));
  const del = () => c.tg.try("deleteMessage", { chat_id: chatId, message_id: msg.message_id });

  // Banned words
  const text = String(msg.text ?? msg.caption ?? "").toLowerCase();
  if (text) {
    const words = await c.db.all<{ word: string }>("SELECT word FROM words WHERE chat_id = ?", chatId);
    const hit = words.find((w) => text.includes(w.word));
    if (hit) {
      await del();
      await notice(c, chatId, `🚫 ${who}, сообщение удалено: запрещённое слово.`);
      return true;
    }
  }

  // Links from recently joined members
  if (s.antilink && hasLink(msg)) {
    const m = await c.db.one<any>("SELECT joined_at FROM members WHERE chat_id = ? AND user_id = ?", chatId, u.id);
    if (m?.joined_at && Date.now() - m.joined_at < s.link_min * 60_000) {
      await del();
      await notice(c, chatId, `🔗 ${who}, новым участникам пока нельзя отправлять ссылки.`);
      return true;
    }
  }

  // Flood control
  if (!edited && s.flood_limit > 0) {
    const win = Math.floor(Date.now() / (Math.max(3, s.flood_sec) * 1000));
    const rows = await c.db.all<{ cnt: number }>(
      `INSERT INTO flood(chat_id, user_id, win, cnt) VALUES (?,?,?,1)
       ON CONFLICT(chat_id, user_id) DO UPDATE SET cnt = CASE WHEN flood.win = excluded.win THEN flood.cnt + 1 ELSE 1 END, win = excluded.win
       RETURNING cnt`, chatId, u.id, win);
    const cnt = rows[0]?.cnt ?? 0;
    if (cnt > s.flood_limit) {
      await del();
      if (cnt === s.flood_limit + 1) {
        await muteUser(c, chatId, u.id, s.flood_mute_min);
        await notice(c, chatId, `🌊 ${who} получил(а) мут на ${s.flood_mute_min} мин за флуд.`, 60);
      }
      return true;
    }
  }
  return false;
}

/* ---------------- admin commands ---------------- */

function targetOf(msg: any): any | null {
  const r = msg.reply_to_message;
  if (!r || r.forum_topic_created) return null;
  return r.from && !r.sender_chat ? r.from : null;
}

export async function cmdModeration(c: Ctx, msg: any, cmd: string, args: string) {
  const chatId = msg.chat.id;
  const s = await c.settings(chatId);
  const t = targetOf(msg);

  if (cmd === "del") {
    if (!msg.reply_to_message) return c.reply(msg, "Ответьте командой /del на сообщение, которое нужно удалить.", 20);
    await c.tg.try("deleteMessage", { chat_id: chatId, message_id: msg.reply_to_message.message_id });
    await c.tg.try("deleteMessage", { chat_id: chatId, message_id: msg.message_id });
    return;
  }

  if (cmd === "unban" && !t) {
    const id = Number(args.trim());
    if (!id) return c.reply(msg, "Ответьте на сообщение пользователя или укажите ID: <code>/unban 123456</code>");
    const ok = await c.tg.try("unbanChatMember", { chat_id: chatId, user_id: id, only_if_banned: true });
    return c.reply(msg, ok ? `✅ Пользователь ${id} разбанен.` : "Не удалось разбанить (проверьте мои права).");
  }

  if (!t) return c.reply(msg, `Команду /${cmd} нужно отправить <b>ответом</b> на сообщение участника.`, 20);
  if (t.id === c.botId) return c.reply(msg, "Себя модерировать не буду 🙂", 20);
  const who = mentionHtml(t.id, userName(t));
  if (["warn", "mute", "ban"].includes(cmd) && (await c.isAdminUser(chatId, t.id))) return c.reply(msg, "Нельзя применить это к администратору.", 20);

  switch (cmd) {
    case "warn": {
      const reason = args.trim();
      const rows = await c.db.all<{ warns: number }>(
        `INSERT INTO members(chat_id, user_id, warns) VALUES (?,?,1)
         ON CONFLICT(chat_id, user_id) DO UPDATE SET warns = members.warns + 1 RETURNING warns`, chatId, t.id);
      const n = rows[0]?.warns ?? 1;
      if (n >= s.warn_limit) {
        await c.db.run("UPDATE members SET warns = 0 WHERE chat_id = ? AND user_id = ?", chatId, t.id);
        await muteUser(c, chatId, t.id, s.warn_mute_hours * 60);
        return c.reply(msg, `⚠️ ${who}: предупреждение ${n}/${s.warn_limit}${reason ? ` (${esc(reason)})` : ""}.\n🔇 Мут на ${s.warn_mute_hours} ч.`);
      }
      return c.reply(msg, `⚠️ ${who}: предупреждение ${n}/${s.warn_limit}${reason ? ` — ${esc(reason)}` : ""}.`);
    }
    case "unwarn": {
      await c.db.run("UPDATE members SET warns = MAX(warns - 1, 0) WHERE chat_id = ? AND user_id = ?", chatId, t.id);
      return c.reply(msg, `✅ С ${who} снято одно предупреждение.`);
    }
    case "mute": {
      const min = Math.min(Math.max(Number(args.trim().match(/\d+/)?.[0] ?? 60), 1), 525600);
      const ok = await muteUser(c, chatId, t.id, min);
      return c.reply(msg, ok ? `🔇 ${who} в муте на ${min} мин.` : "Не удалось замьютить (нужны права «Блокировка участников»).");
    }
    case "unmute": {
      const ok = await restrict(c, chatId, t.id, FULL_PERMS);
      return c.reply(msg, ok ? `🔊 С ${who} снят мут.` : "Не удалось снять мут (проверьте мои права).");
    }
    case "ban": {
      const ok = await c.tg.try("banChatMember", { chat_id: chatId, user_id: t.id, revoke_messages: false });
      if (ok) await c.tg.try("deleteMessage", { chat_id: chatId, message_id: msg.reply_to_message.message_id });
      return c.reply(msg, ok ? `⛔️ ${who} забанен(а).` : "Не удалось забанить (нужны права «Блокировка участников»).");
    }
    case "unban": {
      const ok = await c.tg.try("unbanChatMember", { chat_id: chatId, user_id: t.id, only_if_banned: true });
      return c.reply(msg, ok ? `✅ ${who} разбанен(а).` : "Не удалось разбанить.");
    }
  }
}

/** Text after the command, or the replied-to message text. */
const textArg = (msg: any, args: string) => args.trim() || String(msg.reply_to_message?.text ?? msg.reply_to_message?.caption ?? "").trim();

export async function cmdSetWelcome(c: Ctx, msg: any, args: string) {
  const t = textArg(msg, args);
  if (!t) return c.reply(msg, "Напишите текст после команды или ответьте ей на сообщение.\nПеременные: <code>{name}</code> — имя, <code>{username}</code>, <code>{chat}</code> — название группы.\nСбросить: <code>/setwelcome default</code>");
  const v = /^(default|сброс|по умолчанию)$/i.test(t) ? null : truncate(t, 3000);
  await c.settings(msg.chat.id);
  await c.db.run("UPDATE settings SET welcome_text = ?, welcome_enabled = 1 WHERE chat_id = ?", v, msg.chat.id);
  const s = await c.settings(msg.chat.id);
  return c.reply(msg, "✅ Приветствие сохранено. Пример:\n\n" + renderWelcome(s, msg.from ?? { id: 0, first_name: "Гость" }, msg.chat));
}

export async function cmdSetRules(c: Ctx, msg: any, args: string) {
  const t = textArg(msg, args);
  if (!t) return c.reply(msg, "Напишите правила после команды или ответьте ей на сообщение с правилами.");
  await c.settings(msg.chat.id);
  await c.db.run("UPDATE settings SET rules_text = ? WHERE chat_id = ?", truncate(t, 3500), msg.chat.id);
  return c.reply(msg, "✅ Правила сохранены. Показать: /rules");
}

export async function cmdRules(c: Ctx, msg: any) {
  const s = await c.settings(msg.chat.id);
  return c.reply(msg, s.rules_text ? `📜 <b>Правила чата</b>\n\n${esc(s.rules_text)}` : "Правила пока не заданы. Админ может задать их командой /setrules.");
}

export async function cmdWords(c: Ctx, msg: any, cmd: string, args: string) {
  const chatId = msg.chat.id;
  const list = args.split(/[,\n]/).map((w) => w.trim().toLowerCase()).filter((w) => w.length >= 2).slice(0, 50);
  if (cmd === "words" || !list.length) {
    const rows = await c.db.all<{ word: string }>("SELECT word FROM words WHERE chat_id = ? ORDER BY word", chatId);
    const head = cmd === "words" ? "" : "Укажите слово(а) через запятую: <code>/addword казино, крипта</code>\n\n";
    return c.reply(msg, head + (rows.length ? "🚫 <b>Запрещённые слова:</b> " + rows.map((r) => `<code>${esc(r.word)}</code>`).join(", ") : "Список запрещённых слов пуст."));
  }
  if (cmd === "addword") {
    const n = await c.db.one<{ n: number }>("SELECT COUNT(*) AS n FROM words WHERE chat_id = ?", chatId);
    if ((n?.n ?? 0) + list.length > 300) return c.reply(msg, "Слишком много слов (максимум 300).");
    await c.db.tx(list.map((w) => ["INSERT OR IGNORE INTO words(chat_id, word) VALUES (?,?)", [chatId, w]]));
    return c.reply(msg, `✅ Добавлено: ${list.map((w) => `<code>${esc(w)}</code>`).join(", ")}. Сообщения с ними будут удаляться.`);
  }
  await c.db.tx(list.map((w) => ["DELETE FROM words WHERE chat_id = ? AND word = ?", [chatId, w]]));
  return c.reply(msg, `🗑 Удалено: ${list.map((w) => `<code>${esc(w)}</code>`).join(", ")}.`);
}

/** /set <key> <value> */
const SET_KEYS: Record<string, { col: string; kind: "bool" | "int"; min?: number; max?: number; label: string }> = {
  welcome: { col: "welcome_enabled", kind: "bool", label: "приветствие" },
  cleanservice: { col: "clean_service", kind: "bool", label: "удаление сообщений о входе/выходе" },
  captcha: { col: "captcha", kind: "bool", label: "капча «Я не бот»" },
  captchasec: { col: "captcha_sec", kind: "int", min: 30, max: 600, label: "время на капчу, сек" },
  newbie: { col: "newbie_min", kind: "int", min: 0, max: 10080, label: "новички без медиа, мин" },
  antilink: { col: "antilink", kind: "bool", label: "удаление ссылок от новичков" },
  linkmin: { col: "link_min", kind: "int", min: 1, max: 525600, label: "запрет ссылок для новичков, мин" },
  flood: { col: "flood_limit", kind: "int", min: 0, max: 100, label: "флуд: сообщений за интервал (0 = выкл)" },
  floodsec: { col: "flood_sec", kind: "int", min: 3, max: 120, label: "флуд: интервал, сек" },
  floodmute: { col: "flood_mute_min", kind: "int", min: 1, max: 10080, label: "флуд: мут, мин" },
  warnlimit: { col: "warn_limit", kind: "int", min: 1, max: 20, label: "предупреждений до мута" },
  warnmute: { col: "warn_mute_hours", kind: "int", min: 1, max: 8760, label: "мут за предупреждения, ч" },
};

export async function cmdSet(c: Ctx, msg: any, args: string) {
  const [k, v] = args.trim().toLowerCase().split(/\s+/);
  const def = SET_KEYS[k ?? ""];
  if (!def || v === undefined) {
    return c.reply(msg, "⚙️ <b>Изменить настройку:</b> <code>/set ключ значение</code>\n\n" +
      Object.entries(SET_KEYS).map(([key, d]) => `<code>${key}</code> — ${d.label} (${d.kind === "bool" ? "on/off" : `${d.min}–${d.max}`})`).join("\n") +
      "\n\nНапример: <code>/set captcha off</code>, <code>/set newbie 30</code>");
  }
  let val: number;
  if (def.kind === "bool") {
    if (/^(on|1|вкл|да|yes)$/.test(v)) val = 1; else if (/^(off|0|выкл|нет|no)$/.test(v)) val = 0;
    else return c.reply(msg, "Значение: on или off.");
  } else {
    val = Number(v);
    if (!Number.isInteger(val) || val < def.min! || val > def.max!) return c.reply(msg, `Число от ${def.min} до ${def.max}.`);
  }
  await c.settings(msg.chat.id);
  await c.db.run(`UPDATE settings SET ${def.col} = ? WHERE chat_id = ?`, val, msg.chat.id);
  return c.reply(msg, `✅ ${def.label}: <b>${def.kind === "bool" ? onOff(val) : val}</b>`);
}

export async function cmdSettings(c: Ctx, msg: any) {
  const s = await c.settings(msg.chat.id);
  const words = await c.db.one<{ n: number }>("SELECT COUNT(*) AS n FROM words WHERE chat_id = ?", msg.chat.id);
  const rem = await c.db.one<{ n: number }>("SELECT COUNT(*) AS n FROM reminders WHERE chat_id = ? AND done = 0", msg.chat.id);
  const me = await c.tg.try<any>("getChatMember", { chat_id: msg.chat.id, user_id: c.botId });
  const rights = me?.status === "administrator"
    ? `${me.can_delete_messages ? "✅" : "❌"} удаление сообщений, ${me.can_restrict_members ? "✅" : "❌"} блокировка участников`
    : "❌ я не администратор — модерация и капча не работают";
  return c.reply(msg, [
    `⚙️ <b>Настройки «${esc(msg.chat.title ?? "")}»</b>`,
    `Мои права: ${rights}`,
    "",
    `👋 Приветствие: ${onOff(s.welcome_enabled)}${s.welcome_text ? " (свой текст)" : " (по умолчанию)"}`,
    `🧹 Удалять вход/выход: ${onOff(s.clean_service)}`,
    `📜 Правила: ${s.rules_text ? "заданы" : "не заданы"}`,
    `🤖 Капча: ${onOff(s.captcha)}, ${s.captcha_sec} сек, иначе кик`,
    `🐣 Новички без медиа: ${s.newbie_min ? s.newbie_min + " мин" : "выкл"}`,
    `🔗 Ссылки от новичков: ${s.antilink ? `удаляются первые ${s.link_min} мин` : "разрешены"}`,
    `🌊 Флуд: ${s.flood_limit ? `>${s.flood_limit} сообщ. за ${s.flood_sec} сек → мут ${s.flood_mute_min} мин` : "выкл"}`,
    `⚠️ Предупреждения: ${s.warn_limit} → мут ${s.warn_mute_hours} ч`,
    `🚫 Запрещённых слов: ${words?.n ?? 0} (/words)`,
    `⏰ Активных напоминаний: ${rem?.n ?? 0}`,
    "",
    "Изменить: /set, /setwelcome, /setrules, /addword, /delword",
  ].join("\n"));
}
