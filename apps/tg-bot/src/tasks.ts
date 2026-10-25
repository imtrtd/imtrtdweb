import { Ctx } from "./env";
import { esc, mentionHtml, truncate } from "./tg";
import { fmtDate } from "./time";
import { Row } from "./store";

export function taskLine(c: Ctx, t: Row): string {
  const who = t.assignee_id ? " — " + mentionHtml(t.assignee_id, t.assignee_name || "исполнитель") : t.assignee_name ? ` — ${esc(t.assignee_name)}` : "";
  const due = t.due_at ? ` ⏰ ${fmtDate(t.due_at, c.tz)}` : "";
  return `${t.done ? "✅ <s>" : "▫️ "}<b>#${t.id}</b> ${esc(t.text)}${t.done ? "</s>" : ""}${who}${due}`;
}

export async function renderTasks(c: Ctx, chatId: number, filterUser?: number) {
  const rows = filterUser
    ? await c.db.all("SELECT * FROM tasks WHERE chat_id = ? AND done = 0 AND (assignee_id = ? OR created_by = ?) ORDER BY due_at IS NULL, due_at, id LIMIT 30", chatId, filterUser, filterUser)
    : await c.db.all("SELECT * FROM tasks WHERE chat_id = ? AND done = 0 ORDER BY due_at IS NULL, due_at, id LIMIT 30", chatId);
  const text = rows.length
    ? `🗂 <b>Открытые задачи${filterUser ? " (мои)" : ""}</b>\n\n` + rows.map((t) => taskLine(c, t)).join("\n")
    : "🎉 Открытых задач нет. Создайте: <code>/task Купить воду завтра 10:00</code>";
  const kb: any[][] = [];
  for (let i = 0; i < Math.min(rows.length, 20); i += 2) {
    kb.push(rows.slice(i, i + 2).map((t) => ({ text: `✅ #${t.id} ${truncate(t.text, 18)}`, callback_data: `td:${t.id}:l` })));
  }
  return { text, reply_markup: kb.length ? { inline_keyboard: kb } : undefined };
}

export function reminderMarkup(id: number) {
  return { inline_keyboard: [[
    { text: "✅ Выполнено", callback_data: `td:${id}:r` },
    { text: "⏰ +1 час", callback_data: `ts:${id}:60` },
    { text: "+1 день", callback_data: `ts:${id}:1440` },
  ]] };
}

export async function createTask(c: Ctx, t: { chatId: number; threadId: number; text: string; assigneeId: number | null; assigneeName: string | null; createdBy: number; creatorName: string; due: number | null; remindAt?: number | null; srcMsgId?: number | null }) {
  const r = await c.db.one(
    "INSERT INTO tasks(chat_id, thread_id, text, assignee_id, assignee_name, created_by, creator_name, due_at, remind_at, src_msg_id, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) RETURNING *",
    t.chatId, t.threadId, t.text.slice(0, 500), t.assigneeId, t.assigneeName, t.createdBy, t.creatorName, t.due, t.remindAt ?? null, t.srcMsgId ?? null, Date.now());
  return r!;
}

/** Cron: send due reminders. */
export async function sendDueReminders(c: Ctx) {
  const due = await c.db.all("SELECT * FROM tasks WHERE done = 0 AND reminded = 0 AND COALESCE(remind_at, due_at) IS NOT NULL AND COALESCE(remind_at, due_at) <= ? ORDER BY COALESCE(remind_at, due_at) LIMIT 25", Date.now());
  for (const t of due) {
    await c.db.run("UPDATE tasks SET reminded = 1 WHERE id = ?", t.id);
    const who = t.assignee_id ? mentionHtml(t.assignee_id, t.assignee_name || "исполнитель") + ", " : t.assignee_name ? esc(t.assignee_name) + ", " : t.created_by ? mentionHtml(t.created_by, t.creator_name || "автор") + ", " : "";
    const text = `⏰ ${who}напоминание о задаче <b>#${t.id}</b>:\n${esc(t.text)}${t.due_at && t.remind_at && t.remind_at < t.due_at ? `\nСрок: ${fmtDate(t.due_at, c.tz)}` : ""}`;
    try {
      await c.send(t.chat_id, t.thread_id, text, { reply_markup: reminderMarkup(t.id) });
    } catch (e) {
      console.warn("reminder failed", t.id, String((e as Error).message));
    }
  }
}
