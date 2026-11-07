import { Ctx } from "./env";
import { esc, mentionHtml, truncate, userName } from "./tg";
import { fmtLocal, parseRemind } from "./time";

const USAGE = "Формат:\n<code>/remind 18:30 текст</code>\n<code>/remind завтра 9:00 текст</code>\n<code>/remind 31.12 23:55 текст</code>\n<code>/remind через 15 мин текст</code> (мин / ч / д)";

const threadOf = (msg: any) => (msg.is_topic_message && msg.message_thread_id ? msg.message_thread_id : 0);

export async function cmdRemind(c: Ctx, msg: any, args: string) {
  if (!args.trim()) return c.reply(msg, "⏰ " + USAGE);
  const r = parseRemind(args, c.tz);
  if (!r || !r.text) return c.reply(msg, "Не понял время. " + USAGE);
  const open = await c.db.one<{ n: number }>("SELECT COUNT(*) AS n FROM reminders WHERE chat_id = ? AND done = 0", msg.chat.id);
  if ((open?.n ?? 0) >= 100) return c.reply(msg, "Слишком много активных напоминаний в этом чате (максимум 100).");
  const rows = await c.db.all<{ id: number }>(
    "INSERT INTO reminders(chat_id, thread_id, text, at, created_by, creator_name, created_at) VALUES (?,?,?,?,?,?,?) RETURNING id",
    msg.chat.id, threadOf(msg), truncate(r.text, 1000), r.at, msg.from?.id ?? 0, userName(msg.from), Date.now());
  return c.reply(msg, `✅ Напоминание #${rows[0].id} на <b>${fmtLocal(r.at, c.tz)}</b> (Киев):\n${esc(truncate(r.text, 300))}`);
}

export async function cmdReminders(c: Ctx, msg: any) {
  const rows = await c.db.all<any>("SELECT id, text, at, creator_name FROM reminders WHERE chat_id = ? AND done = 0 ORDER BY at LIMIT 30", msg.chat.id);
  if (!rows.length) return c.reply(msg, "Активных напоминаний нет. Создать: /remind");
  const lines = rows.map((r) => `#${r.id} · <b>${fmtLocal(r.at, c.tz)}</b> — ${esc(truncate(r.text, 80))} <i>(${esc(r.creator_name)})</i>`);
  return c.reply(msg, "⏰ <b>Напоминания</b> (время Киева):\n" + lines.join("\n") + "\n\nУдалить: <code>/delremind ID</code>");
}

export async function cmdDelRemind(c: Ctx, msg: any, args: string, isAdmin: boolean) {
  const id = Number(args.trim().replace(/^#/, ""));
  if (!id) return c.reply(msg, "Укажите номер: <code>/delremind 12</code> (список — /reminders)");
  const r = await c.db.one<any>("SELECT id, created_by FROM reminders WHERE id = ? AND chat_id = ? AND done = 0", id, msg.chat.id);
  if (!r) return c.reply(msg, `Напоминание #${id} не найдено.`);
  if (!isAdmin && r.created_by !== msg.from?.id) return c.reply(msg, "Удалить напоминание может только его автор или админ.");
  await c.db.run("DELETE FROM reminders WHERE id = ?", id);
  return c.reply(msg, `🗑 Напоминание #${id} удалено.`);
}

export async function sendDueReminders(c: Ctx) {
  const due = await c.db.all<any>("SELECT * FROM reminders WHERE done = 0 AND at <= ? ORDER BY at LIMIT 30", Date.now());
  for (const r of due) {
    await c.db.run("UPDATE reminders SET done = 1 WHERE id = ?", r.id);
    const who = r.created_by && r.chat_id < 0 ? `\n<i>от ${mentionHtml(r.created_by, r.creator_name || "?")}</i>` : "";
    const extra: Record<string, unknown> = {};
    if (r.thread_id) extra.message_thread_id = r.thread_id;
    await c.send(r.chat_id, `⏰ <b>Напоминание</b>\n${esc(r.text)}${who}`, extra);
  }
}
