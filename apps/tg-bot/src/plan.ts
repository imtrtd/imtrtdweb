// Auto-plans: a group message that looks like a to-do list is parsed by Workers AI into tasks,
// saved to the task storage and echoed back as a checklist with "done" buttons.
import { Ctx } from "./env";
import { esc, truncate } from "./tg";
import { localParts, zonedToUtc } from "./time";
import { createTask, taskLine } from "./tasks";
import { Row } from "./store";

const ITEM_RE = /^\s*(?:[-–—•*·▪▫◦✓✔☐□]|\d{1,2}[.)])\s*\S/;
const TIME_RE = /(\b([01]?\d|2[0-3])[:.][0-5]\d\b|\b([01]?\d|2[0-3])\s*[-–—]\s*([01]?\d|2[0-3])(:[0-5]\d)?\b|\b\d{1,2}\.\d{1,2}(\.\d{2,4})?\b|сегодня|завтра|послезавтра|понедельник|вторник|сред[уа]|четверг|пятниц[уа]|суббот[уа]|воскресенье|дедлайн|до \d)/i;
const CUE_RE = /(задач[аи]?|сделать|нужно|надо|не забыть|подготовить|to-?do|чек-?лист|план на)/i;

/** Cheap, conservative pre-filter so normal chat never reaches the LLM. */
export function looksLikePlan(text: string): boolean {
  if (text.length < 15 || text.length > 3000 || text.startsWith("/")) return false;
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const items = lines.filter((l) => ITEM_RE.test(l)).length;
  if (items >= 2) return true;
  // No bullets: a dated/timed message with an explicit cue and several lines of actions.
  return lines.length >= 3 && TIME_RE.test(text) && CUE_RE.test(text);
}

export interface PlanTask { title: string; due: number | null; assignee: string | null }
export interface Plan { header: string; topicId: number | null; tasks: PlanTask[] }

/** Topic name hints (used when a plan is posted in General). Seeded from FORUM_TOPICS + learned from updates. */
export async function knownTopics(c: Ctx, chatId: number): Promise<Array<{ id: number; name: string }>> {
  const map = new Map<number, string>();
  if (String(chatId) === c.env.HOME_CHAT_ID && c.env.FORUM_TOPICS) {
    try { for (const [k, v] of Object.entries(JSON.parse(c.env.FORUM_TOPICS))) map.set(Number(k), String(v)); } catch { /* bad var */ }
  }
  for (const r of await c.db.all("SELECT thread_id, name FROM topics WHERE chat_id = ?", chatId)) map.set(Number(r.thread_id), String(r.name));
  return [...map].map(([id, name]) => ({ id, name }));
}

export async function rememberTopic(c: Ctx, chatId: number, threadId: number, name: string) {
  if (!threadId || !name) return;
  await c.db.run("INSERT INTO topics(chat_id, thread_id, name, updated_at) VALUES (?,?,?,?) ON CONFLICT(chat_id, thread_id) DO UPDATE SET name = excluded.name, updated_at = excluded.updated_at",
    chatId, threadId, name.slice(0, 128), Date.now());
}

function parseLocalDue(v: unknown, tz: string): number | null {
  const m = String(v ?? "").match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})/);
  if (!m) return null;
  const ts = zonedToUtc(+m[1], +m[2], +m[3], +m[4], +m[5], tz);
  return Number.isFinite(ts) ? ts : null;
}

/** Ask Workers AI to turn the message into tasks. Returns null when it is not a plan. */
export async function aiParsePlan(c: Ctx, text: string, msgTs: number, topics: Array<{ id: number; name: string }>): Promise<Plan | null> {
  const p = localParts(msgTs, c.tz);
  const pad = (n: number) => String(n).padStart(2, "0");
  const wd = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"][p.wd];
  const system =
    "Ты извлекаешь задачи из сообщения рабочего чата (тату-студия и проекты). Ответь ТОЛЬКО JSON без пояснений:\n" +
    '{"is_plan": boolean, "header": string, "topic_id": number|null, "tasks": [{"title": string, "due": "YYYY-MM-DD HH:MM"|null, "assignee": string|null}]}\n' +
    "Правила: is_plan=true только если в сообщении есть список дел/план (минимум 2 действия) или явная просьба создать задачи; обычная болтовня — is_plan=false и tasks=[]. " +
    "title — короткая формулировка действия по-русски с заглавной буквы, без маркеров списка и без даты. " +
    `Сообщение отправлено ${p.y}-${pad(p.mo)}-${pad(p.d)} ${pad(p.h)}:${pad(p.mi)} (${wd}, Киев); относительные даты считай от него. ` +
    "Если для всего списка указано одно время или интервал (например «19-20:00 рассылка»), подготовительные пункты получают срок = начало интервала, а само мероприятие добавь отдельной задачей со сроком = конец интервала и интервалом в title. " +
    "Если срок не указан — due=null. assignee — только если исполнитель явно назван (@ник или имя), иначе null. " +
    "header — короткий заголовок плана (до 60 символов) с подходящим эмодзи. " +
    "topic_id — id самой подходящей темы из списка или null: " + (topics.length ? topics.map((t) => `${t.id}=«${t.name}»`).join(", ") : "(нет тем)") + ".";
  const messages = [{ role: "system", content: system }, { role: "user", content: text.slice(0, 3000) }];
  const models = [c.env.AI_MODEL, c.env.AI_FALLBACK_MODEL].filter(Boolean);
  for (const model of models) {
    try {
      const out: any = await c.env.AI.run(model as any, { messages, max_tokens: 900, temperature: 0.1 } as any);
      const raw = typeof out === "string" ? out : out?.response ?? out?.choices?.[0]?.message?.content ?? "";
      const j = typeof raw === "object" ? raw : JSON.parse(String(raw).match(/\{[\s\S]*\}/)?.[0] ?? "null");
      if (!j || typeof j !== "object") continue;
      if (!j.is_plan || !Array.isArray(j.tasks)) return null;
      const tasks: PlanTask[] = j.tasks
        .map((t: any) => ({ title: String(t?.title ?? "").trim().slice(0, 300), due: parseLocalDue(t?.due, c.tz), assignee: t?.assignee ? String(t.assignee).trim().slice(0, 64) || null : null }))
        .filter((t: PlanTask) => t.title)
        .slice(0, 20);
      const topicId = Number(j.topic_id);
      return { header: String(j.header ?? "").trim().slice(0, 80) || "📝 План", topicId: topics.some((t) => t.id === topicId) ? topicId : null, tasks };
    } catch (e) {
      console.warn("plan AI failed", model, String((e as Error)?.message ?? e));
    }
  }
  return null;
}

export function renderPlan(c: Ctx, header: string, tasks: Row[]) {
  const text = `<b>${esc(header)}</b>\n\n` + tasks.map((t, i) => `${i + 1}. ${taskLine(c, t)}`).join("\n") +
    "\n\nЗадачи добавлены в /tasks и в панель (/app).";
  const open = tasks.filter((t) => !t.done);
  const kb: any[][] = [];
  for (let i = 0; i < open.length; i += 2) {
    kb.push(open.slice(i, i + 2).map((t) => ({ text: `✅ #${t.id} ${truncate(String(t.text), 18)}`, callback_data: `td:${t.id}:p` })));
  }
  return { text, reply_markup: { inline_keyboard: kb } };
}

/** Header is kept as the first line of the bot message; re-render after a "done" button press. */
export async function rerenderPlan(c: Ctx, chatId: number, messageId: number, srcMsgId: number, currentText: string) {
  const tasks = await c.db.all("SELECT * FROM tasks WHERE chat_id = ? AND src_msg_id = ? ORDER BY id", chatId, srcMsgId);
  const header = (currentText.split("\n")[0] || "📝 План").trim();
  const r = renderPlan(c, header, tasks);
  await c.tg.try("editMessageText", { chat_id: chatId, message_id: messageId, text: r.text, parse_mode: "HTML", reply_markup: r.reply_markup });
}

/** Save tasks for a plan and post (or edit) the checklist. Returns created rows + message id. */
export async function publishPlan(c: Ctx, o: {
  chatId: number; threadId: number; header: string; srcMsgId: number; createdBy: number; creatorName: string;
  tasks: Array<{ title: string; due: number | null; remindAt?: number | null; assigneeId?: number | null; assignee: string | null }>;
  replyToMsgId?: number; editMessageId?: number;
}) {
  const rows: Row[] = [];
  for (const t of o.tasks) {
    rows.push(await createTask(c, { chatId: o.chatId, threadId: o.threadId, text: t.title, assigneeId: t.assigneeId ?? null, assigneeName: t.assignee, createdBy: o.createdBy, creatorName: o.creatorName, due: t.due, remindAt: t.remindAt ?? null, srcMsgId: o.srcMsgId }));
  }
  const r = renderPlan(c, o.header, rows);
  let messageId = o.editMessageId ?? null;
  if (messageId) {
    await c.tg.call("editMessageText", { chat_id: o.chatId, message_id: messageId, text: r.text, parse_mode: "HTML", reply_markup: r.reply_markup, link_preview_options: { is_disabled: true } });
    await c.rememberBotMsg(o.chatId, o.threadId, messageId);
  } else {
    const extra: Record<string, unknown> = { reply_markup: r.reply_markup };
    if (o.replyToMsgId) extra.reply_parameters = { message_id: o.replyToMsgId, allow_sending_without_reply: true };
    const m = await c.send(o.chatId, o.threadId, r.text, extra);
    messageId = m?.message_id ?? null;
  }
  return { rows, messageId };
}

/** Entry point from onMessage. Returns true when the message was handled as a plan. */
export async function maybeHandlePlan(c: Ctx, msg: any, thread: number, text: string, authorId: number, authorName: string): Promise<boolean> {
  if (!looksLikePlan(text)) return false;
  const chatId: number = msg.chat.id;
  // Idempotency: Telegram may redeliver an update; edits are not subscribed to (allowed_updates), so no re-creation on edit.
  const fresh = await c.db.one("INSERT OR IGNORE INTO plans_seen(chat_id, message_id, ts) VALUES (?,?,?) RETURNING message_id", chatId, msg.message_id, Date.now());
  if (!fresh) return true;
  const topics = await knownTopics(c, chatId);
  const plan = await aiParsePlan(c, text, (msg.date ?? Math.floor(Date.now() / 1000)) * 1000, topics);
  if (!plan) return false;
  const explicit = /(задач|to-?do|чек-?лист)/i.test(text);
  if (plan.tasks.length < 2 && !(explicit && plan.tasks.length === 1)) return false;

  let target = thread;
  if (!target) target = plan.topicId ?? topics.find((t) => /задач/i.test(t.name))?.id ?? 0;

  const tasks = [];
  for (const t of plan.tasks) {
    let assigneeId: number | null = null;
    let assignee = t.assignee;
    const um = assignee?.match(/^@?([A-Za-z0-9_]{4,32})$/);
    if (um && assignee!.startsWith("@")) {
      const row = await c.db.one("SELECT user_id, first_name FROM users WHERE uname = ?", um[1].toLowerCase());
      if (row) { assigneeId = Number(row.user_id); assignee = String(row.first_name || assignee); }
    }
    tasks.push({ title: t.title, due: t.due, assigneeId, assignee });
  }
  await publishPlan(c, {
    chatId, threadId: target, header: plan.header, srcMsgId: msg.message_id, createdBy: authorId, creatorName: authorName, tasks,
    replyToMsgId: target === thread ? msg.message_id : undefined,
  });
  return true;
}
