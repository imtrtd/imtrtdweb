import { Ctx } from "./env";
import * as G from "./group";
import { cmdDelRemind, cmdReminders, cmdRemind } from "./reminders";
import { onBusinessConnection, onBusinessMessage, onDeletedBusinessMessages, onPrivateText, ownerCommand } from "./business";

const HELP_GROUP = `🤖 <b>IMTRTD Group Automation</b>

<b>Для всех</b>
/rules — правила чата
/remind 18:30 текст · /remind через 15 мин текст — напоминание
/reminders — список · /delremind ID — удалить своё

<b>Для админов</b> (ответом на сообщение)
/warn [причина] — предупреждение (3 → мут 24 ч) · /unwarn
/mute [мин] · /unmute · /ban · /unban · /del

<b>Настройка (админы)</b>
/settings — текущие настройки
/setwelcome текст — приветствие ({name}, {chat})
/setrules текст — правила
/addword слово · /delword слово · /words — запрещённые слова
/set — капча, новички, ссылки, флуд и др.

Чтобы всё работало, сделайте меня администратором с правами «Удаление сообщений» и «Блокировка участников».`;

const HELP_PRIVATE = `👋 Привет! Я <b>IMTRTD Group Automation</b> — бот для групп.

Что умею:
• приветствие новичков и удаление сообщений о входе/выходе
• правила (/rules)
• капча «Я не бот» для новых участников, иначе — кик
• антиспам: ссылки от новичков, флуд, запрещённые слова
• модерация: /warn, /mute, /ban, /del
• напоминания: /remind 18:30 текст

Как начать: добавьте меня в группу, сделайте администратором и напишите там /help или /settings.

Здесь, в личке, тоже работают напоминания: /remind через 10 мин позвонить.`;

const OWNER_HELP = `\n\n💼 <b>Владельцу (Telegram Business)</b>\n/business — статус · /business on|off · /business ai on|off\n/setautoreply текст — шаблон автоответа\n/pause N — пауза автоответов на N минут (0 — снять)\n/cooldown H — повтор шаблона тому же человеку не чаще, чем раз в H ч`;

const ADMIN_CMDS = new Set(["warn", "unwarn", "mute", "unmute", "ban", "unban", "del", "setwelcome", "setrules", "addword", "delword", "words", "set", "settings"]);

function parseCommand(c: Ctx, text: string): { cmd: string; args: string } | null {
  const m = text.match(/^\/([a-z0-9_]+)(?:@([a-z0-9_]+))?(?:\s+([\s\S]*))?$/i);
  if (!m) return null;
  if (m[2] && m[2].toLowerCase() !== c.env.BOT_USERNAME.toLowerCase()) return null;
  return { cmd: m[1].toLowerCase(), args: m[3] ?? "" };
}

async function onPrivate(c: Ctx, msg: any) {
  const raw = String(msg.text ?? "");
  const p = parseCommand(c, raw);
  if (!p) {
    // Plain text / caption (not a command) → AI reply in the same persona as Business replies.
    if (!raw.trimStart().startsWith("/")) await onPrivateText(c, msg);
    return;
  }
  if (await ownerCommand(c, msg, p.cmd, p.args)) return;
  const owner = await c.isOwner(msg.from?.id);
  switch (p.cmd) {
    case "start": case "help": return c.reply(msg, HELP_PRIVATE + (owner ? OWNER_HELP : ""));
    case "remind": return cmdRemind(c, msg, p.args);
    case "reminders": return cmdReminders(c, msg);
    case "delremind": return cmdDelRemind(c, msg, p.args, true);
    default:
      if (ADMIN_CMDS.has(p.cmd) || p.cmd === "rules") return c.reply(msg, "Эта команда работает в группе, где я администратор.");
  }
}

async function onGroup(c: Ctx, msg: any, edited: boolean) {
  if (msg.new_chat_members?.length) return G.onNewMembers(c, msg);
  if (msg.left_chat_member) return G.onLeft(c, msg);
  if (edited) { await G.antispam(c, msg, true); return; }
  const p = parseCommand(c, String(msg.text ?? ""));
  if (await G.antispam(c, msg)) return;
  if (!p) return;
  if (ADMIN_CMDS.has(p.cmd) && !(await c.isAdminMsg(msg))) {
    await c.reply(msg, "Эта команда только для администраторов.", 15);
    return;
  }
  switch (p.cmd) {
    case "start": case "help": return c.reply(msg, HELP_GROUP);
    case "rules": return G.cmdRules(c, msg);
    case "remind": return cmdRemind(c, msg, p.args);
    case "reminders": return cmdReminders(c, msg);
    case "delremind": return cmdDelRemind(c, msg, p.args, await c.isAdminMsg(msg));
    case "settings": return G.cmdSettings(c, msg);
    case "set": return G.cmdSet(c, msg, p.args);
    case "setwelcome": return G.cmdSetWelcome(c, msg, p.args);
    case "setrules": return G.cmdSetRules(c, msg, p.args);
    case "addword": case "delword": case "words": return G.cmdWords(c, msg, p.cmd, p.args);
    case "warn": case "unwarn": case "mute": case "unmute": case "ban": case "unban": case "del":
      return G.cmdModeration(c, msg, p.cmd, p.args);
  }
}

export async function handleUpdate(c: Ctx, u: any) {
  if (u.business_connection) return onBusinessConnection(c, u.business_connection);
  if (u.business_message) return onBusinessMessage(c, u.business_message);
  if (u.edited_business_message) return onBusinessMessage(c, u.edited_business_message, true);
  if (u.deleted_business_messages) return onDeletedBusinessMessages(c, u.deleted_business_messages);
  if (u.callback_query) {
    const cq = u.callback_query;
    if (String(cq.data ?? "").startsWith("cap:")) return G.onCaptchaButton(c, cq);
    return c.tg.try("answerCallbackQuery", { callback_query_id: cq.id });
  }
  const msg = u.message ?? u.edited_message;
  if (!msg?.chat) return;
  if (msg.chat.type === "private") return u.message ? onPrivate(c, msg) : undefined;
  if (msg.chat.type === "group" || msg.chat.type === "supergroup") return onGroup(c, msg, !u.message);
}
