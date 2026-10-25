// Remote MCP server (Streamable HTTP, stateless JSON responses) so AI assistants can manage the bot.
// Auth (Bearer MCP_KEY) is checked in index.ts before we get here. All business logic is reused from
// tasks.ts / lists.ts / plan.ts / bot.ts / setup.ts — this file only maps tool calls onto it.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { Ctx } from "./env";
import { Row } from "./store";
import { createTask, deleteTask, setTaskDone } from "./tasks";
import { addItems, createList, getList, listItems, refreshList, repostList, toggleItem } from "./lists";
import { knownTopics, publishPlan, rememberTopic } from "./plan";
import { SETTING_FIELDS, setSetting, setWelcomeText } from "./bot";
import { lastWebhookHeal, webhookUrl } from "./setup";
import { esc } from "./tg";
import { fmtLocalIso, parseLocalDateTime, parseWhen } from "./time";

const VERSION = "1.0.0";

type Json = Record<string, unknown> | unknown[];
const ok = (data: Json) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });

class ToolError extends Error {}

// ---------------------------------------------------------------- shared schema bits
const chatIdArg = z.number().int().optional().describe("Telegram chat id. По умолчанию — группа «Главная» (HOME_CHAT_ID). / Defaults to the home group.");
const topicArg = z.union([z.number().int(), z.string()]).optional()
  .describe("Тема форума: id (message_thread_id) или название (как в list_topics). 0 / \"General\" / \"Общий\" = общая тема. / Forum topic: thread id or name.");
const timeArg = (what: string) => z.string().optional()
  .describe(`${what}. Время Киева (Europe/Kiev): \"YYYY-MM-DD HH:MM\" или по-русски: \"завтра 10:00\", \"через 2 часа\", \"в пятницу 18:30\". / Kyiv local time.`);

// ---------------------------------------------------------------- helpers
function homeChat(c: Ctx, chatId?: number): number {
  const id = chatId ?? Number(c.env.HOME_CHAT_ID);
  if (!id) throw new ToolError("chat_id не указан и HOME_CHAT_ID не настроен");
  return id;
}

/** "YYYY-MM-DD HH:MM" or free Russian text -> UTC ms. undefined -> undefined, ""/null -> null (clear). */
function parseTime(c: Ctx, v: string | null | undefined, field: string): number | null | undefined {
  if (v === undefined) return undefined;
  if (v === null || !v.trim()) return null;
  const exact = parseLocalDateTime(v, c.tz);
  if (exact) return exact;
  const r = parseWhen(v, c.tz);
  if (r.due && !r.rest.trim()) return r.due;
  throw new ToolError(`${field}: не понял время «${v}». Используйте "YYYY-MM-DD HH:MM" (Киев) или "завтра 10:00".`);
}

const t2s = (c: Ctx, ts: unknown) => (ts ? fmtLocalIso(Number(ts), c.tz) : null);

async function resolveTopic(c: Ctx, chatId: number, topic: number | string | undefined): Promise<number> {
  if (topic === undefined || topic === null || topic === "") return 0;
  if (typeof topic === "number") return topic;
  const s = topic.trim();
  if (/^\d+$/.test(s)) return Number(s);
  if (/^(general|общ(ий|ая|ее)|основн(ой|ая|ое))$/i.test(s)) return 0;
  const topics = await knownTopics(c, chatId);
  const low = s.toLowerCase().replace(/^#/, "");
  const hit = topics.find((t) => t.name.toLowerCase() === low) ?? topics.find((t) => t.name.toLowerCase().includes(low));
  if (!hit) throw new ToolError(`Тема «${s}» не найдена. Известные темы: ${topics.map((t) => `${t.id}=${t.name}`).join(", ") || "нет"}`);
  return hit.id;
}

async function topicNames(c: Ctx, chatId: number) {
  return new Map((await knownTopics(c, chatId)).map((t) => [t.id, t.name]));
}

/** "@username" -> known user id; numeric -> user id; otherwise a free-text name. */
async function resolveAssignee(c: Ctx, v: string | undefined | null): Promise<{ id: number | null; name: string | null } | undefined> {
  if (v === undefined) return undefined;
  const s = (v ?? "").trim();
  if (!s) return { id: null, name: null };
  const um = s.match(/^@([A-Za-z0-9_]{3,32})$/);
  if (um) {
    const row = await c.db.one("SELECT user_id, first_name FROM users WHERE uname = ?", um[1].toLowerCase());
    return row ? { id: Number(row.user_id), name: String(row.first_name || um[1]) } : { id: null, name: s };
  }
  if (/^\d{5,}$/.test(s)) {
    const row = await c.db.one("SELECT user_id, first_name FROM users WHERE user_id = ?", Number(s));
    return { id: Number(s), name: row?.first_name ? String(row.first_name) : s };
  }
  return { id: null, name: s.slice(0, 64) };
}

async function creator(c: Ctx) {
  const row = await c.db.one("SELECT first_name FROM users WHERE user_id = ?", c.ownerId);
  return { id: c.ownerId, name: String(row?.first_name || "Владелец") };
}

function msgLink(chatId: number, threadId: number, messageId: number) {
  const id = String(chatId).replace(/^-100/, "");
  return threadId ? `https://t.me/c/${id}/${threadId}/${messageId}` : `https://t.me/c/${id}/${messageId}`;
}

function taskOut(c: Ctx, t: Row, topics?: Map<number, string>) {
  return {
    id: Number(t.id), chat_id: Number(t.chat_id), title: t.text,
    topic_id: Number(t.thread_id) || 0, topic: topics ? topics.get(Number(t.thread_id)) ?? (Number(t.thread_id) ? null : "General") : undefined,
    assignee: t.assignee_name ?? null, assignee_id: t.assignee_id ? Number(t.assignee_id) : null,
    due: t2s(c, t.due_at), remind_at: t2s(c, t.remind_at), reminded: !!t.reminded,
    done: !!t.done, done_at: t2s(c, t.done_at), created_by: t.creator_name ?? null, created_at: t2s(c, t.created_at),
  };
}

async function getTask(c: Ctx, id: number) {
  const t = await c.db.one("SELECT * FROM tasks WHERE id = ?", id);
  if (!t) throw new ToolError(`Задача #${id} не найдена`);
  return t;
}

async function listOut(c: Ctx, l: Row, withItems: boolean, topics?: Map<number, string>) {
  const items = await listItems(c, Number(l.id));
  return {
    id: Number(l.id), name: l.name, topic_id: Number(l.thread_id) || 0, topic: topics?.get(Number(l.thread_id)) ?? undefined,
    message_id: l.message_id ? Number(l.message_id) : null,
    done: items.filter((i) => i.done).length, total: items.length,
    items: withItems ? items.map((i) => ({ id: Number(i.id), text: i.text, done: !!i.done })) : undefined,
  };
}

async function requireBotMsg(c: Ctx, chatId: number, messageId: number) {
  const r = await c.db.one("SELECT 1 AS x FROM bot_msgs WHERE chat_id = ? AND message_id = ?", chatId, messageId);
  if (!r) throw new ToolError(`Сообщение ${messageId} не найдено среди сообщений бота — менять/удалять можно только сообщения бота`);
}

// ---------------------------------------------------------------- server
function buildServer(c: Ctx): McpServer {
  const server = new McpServer(
    { name: "namenlos-tg-bot", title: "Grok Assistant (Telegram «Главная»)", version: VERSION },
    { instructions: "Управление Telegram-ботом @" + c.botUsername + " в группе «Главная»: задачи с напоминаниями, списки, опросы, темы форума, сообщения, настройки. Все времена — Europe/Kiev. По умолчанию chat_id = «Главная». / Manage the Telegram bot in the home forum group. All times are Europe/Kiev." },
  );

  const tool = <S extends z.ZodRawShape>(name: string, title: string, description: string, shape: S, run: (a: z.infer<z.ZodObject<S>>) => Promise<Json>, readOnly = false) => {
    server.registerTool(name, { title, description, inputSchema: shape, annotations: { readOnlyHint: readOnly, openWorldHint: true } } as any, (async (args: any) => {
      try { return ok(await run(args)); }
      catch (e) {
        const msg = e instanceof ToolError ? e.message : `Ошибка: ${String((e as Error)?.message ?? e)}`;
        if (!(e instanceof ToolError)) console.warn("mcp tool failed", name, msg);
        return { isError: true, content: [{ type: "text" as const, text: msg }] };
      }
    }) as any);
  };

  // ------------------------------------------------ tasks
  tool("list_tasks", "Список задач",
    "Задачи группы с фильтрами. / List tasks. status: open (по умолчанию) | done | all; topic — id или название темы; assignee — @username, user id или часть имени.",
    {
      chat_id: chatIdArg,
      status: z.enum(["open", "done", "all"]).optional().describe("open (default) | done | all"),
      topic: topicArg,
      assignee: z.string().optional().describe("@username, user id или часть имени исполнителя / assignee filter"),
      limit: z.number().int().min(1).max(200).optional().describe("Максимум задач (default 50)"),
    },
    async (a) => {
      const chatId = homeChat(c, a.chat_id);
      const where = ["chat_id = ?"]; const p: (string | number)[] = [chatId];
      const st = a.status ?? "open";
      if (st !== "all") { where.push("done = ?"); p.push(st === "done" ? 1 : 0); }
      if (a.topic !== undefined) { where.push("thread_id = ?"); p.push(await resolveTopic(c, chatId, a.topic)); }
      if (a.assignee) {
        const as = await resolveAssignee(c, a.assignee);
        if (as?.id) { where.push("assignee_id = ?"); p.push(as.id); }
        else { where.push("LOWER(COALESCE(assignee_name, '')) LIKE ?"); p.push(`%${a.assignee.replace(/^@/, "").toLowerCase()}%`); }
      }
      const order = st === "done" ? "done_at DESC, id DESC" : "done, due_at IS NULL, due_at, id";
      const rows = await c.db.all(`SELECT * FROM tasks WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ?`, ...p, a.limit ?? 50);
      const topics = await topicNames(c, chatId);
      return { chat_id: chatId, timezone: c.tz, count: rows.length, tasks: rows.map((t) => taskOut(c, t, topics)) };
    }, true);

  tool("create_tasks", "Создать задачи",
    "Создать одну или несколько задач с напоминаниями. / Create one or many tasks. По умолчанию задачи сохраняются тихо (без сообщения в группе); post_checklist=true публикует чек-лист с кнопками ✅, как авто-разбор плана (тогда все задачи — в теме checklist_topic). Напоминание приходит в remind_at, иначе в due.",
    {
      chat_id: chatIdArg,
      tasks: z.array(z.object({
        title: z.string().min(1).max(500).describe("Текст задачи / task title"),
        due: timeArg("Срок / due"),
        remind_at: timeArg("Когда напомнить (если не равно сроку) / reminder time"),
        topic: topicArg,
        assignee: z.string().optional().describe("Исполнитель: @username, user id или имя / assignee"),
      })).min(1).max(30),
      post_checklist: z.boolean().optional().describe("Опубликовать чек-лист в группе (default false)"),
      checklist_topic: topicArg,
      header: z.string().max(200).optional().describe("Заголовок чек-листа (default «📝 План»)"),
    },
    async (a) => {
      const chatId = homeChat(c, a.chat_id);
      const who = await creator(c);
      const prepared = [];
      for (const [i, t] of a.tasks.entries()) {
        const as = await resolveAssignee(c, t.assignee);
        prepared.push({
          title: t.title.trim(), due: parseTime(c, t.due, `tasks[${i}].due`) ?? null, remindAt: parseTime(c, t.remind_at, `tasks[${i}].remind_at`) ?? null,
          assigneeId: as?.id ?? null, assignee: as?.name ?? null, threadId: await resolveTopic(c, chatId, t.topic),
        });
      }
      const topics = await topicNames(c, chatId);
      if (a.post_checklist) {
        const threadId = a.checklist_topic !== undefined ? await resolveTopic(c, chatId, a.checklist_topic) : prepared[0].threadId;
        // Synthetic negative source id groups these tasks for checklist re-rendering without clashing with real message ids.
        const srcMsgId = -Math.floor(Date.now() / 1000);
        const r = await publishPlan(c, { chatId, threadId, header: (a.header ?? "📝 План").trim() || "📝 План", srcMsgId, createdBy: who.id, creatorName: who.name, tasks: prepared });
        return { chat_id: chatId, checklist_message_id: r.messageId, link: r.messageId ? msgLink(chatId, threadId, r.messageId) : null, tasks: r.rows.map((t) => taskOut(c, t, topics)) };
      }
      const rows = [];
      for (const t of prepared) {
        rows.push(await createTask(c, { chatId, threadId: t.threadId, text: t.title, assigneeId: t.assigneeId, assigneeName: t.assignee, createdBy: who.id, creatorName: who.name, due: t.due, remindAt: t.remindAt }));
      }
      return { chat_id: chatId, tasks: rows.map((t) => taskOut(c, t, topics)) };
    });

  tool("update_task", "Изменить задачу",
    "Изменить задачу: текст, срок, напоминание, тему, исполнителя. Пустая строка в due/remind_at/assignee очищает поле. Новый срок/напоминание снова включает напоминание. / Update a task.",
    {
      task_id: z.number().int(),
      title: z.string().min(1).max(500).optional(),
      due: timeArg("Новый срок (\"\" — убрать)"),
      remind_at: timeArg("Новое время напоминания (\"\" — напоминать в срок)"),
      topic: topicArg,
      assignee: z.string().optional().describe("@username, user id, имя или \"\" — снять исполнителя"),
    },
    async (a) => {
      const t = await getTask(c, a.task_id);
      const sets: string[] = []; const p: (string | number | null)[] = [];
      if (a.title !== undefined) { sets.push("text = ?"); p.push(a.title.trim().slice(0, 500)); }
      const due = parseTime(c, a.due, "due"); const rem = parseTime(c, a.remind_at, "remind_at");
      if (due !== undefined) { sets.push("due_at = ?"); p.push(due); }
      if (rem !== undefined) { sets.push("remind_at = ?"); p.push(rem); }
      else if (due !== undefined) sets.push("remind_at = NULL");
      if (due !== undefined || rem !== undefined) sets.push("reminded = 0");
      if (a.topic !== undefined) { sets.push("thread_id = ?"); p.push(await resolveTopic(c, Number(t.chat_id), a.topic)); }
      const as = await resolveAssignee(c, a.assignee);
      if (as) { sets.push("assignee_id = ?", "assignee_name = ?"); p.push(as.id, as.name); }
      if (!sets.length) throw new ToolError("Нечего менять: передайте хотя бы одно поле");
      await c.db.run(`UPDATE tasks SET ${sets.join(", ")} WHERE id = ?`, ...p, t.id);
      return { task: taskOut(c, await getTask(c, t.id), await topicNames(c, Number(t.chat_id))) };
    });

  tool("complete_task", "Выполнить задачу", "Отметить задачу выполненной ✅. / Mark a task done.", { task_id: z.number().int() }, async (a) => {
    const t = await getTask(c, a.task_id);
    await setTaskDone(c, t.id, true);
    return { task: taskOut(c, await getTask(c, t.id)) };
  });

  tool("reopen_task", "Вернуть задачу", "Снова открыть выполненную задачу (напоминание включится, если его время ещё впереди). / Reopen a task.", { task_id: z.number().int() }, async (a) => {
    const t = await getTask(c, a.task_id);
    await setTaskDone(c, t.id, false);
    return { task: taskOut(c, await getTask(c, t.id)) };
  });

  tool("delete_task", "Удалить задачу", "Удалить задачу навсегда. / Delete a task permanently.", { task_id: z.number().int() }, async (a) => {
    const t = await getTask(c, a.task_id);
    await deleteTask(c, t.id);
    return { deleted: Number(t.id), title: t.text };
  });

  // ------------------------------------------------ lists
  tool("list_lists", "Списки", "Списки с галочками (покупки и т.п.) и их пункты. / Checklists and their items.", {
    chat_id: chatIdArg,
    include_items: z.boolean().optional().describe("Включить пункты (default true)"),
  }, async (a) => {
    const chatId = homeChat(c, a.chat_id);
    const rows = await c.db.all("SELECT * FROM lists WHERE chat_id = ? ORDER BY id DESC LIMIT 50", chatId);
    const topics = await topicNames(c, chatId);
    const lists = [];
    for (const l of rows) lists.push(await listOut(c, l, a.include_items ?? true, topics));
    return { chat_id: chatId, lists };
  }, true);

  tool("create_list", "Создать список", "Создать список с галочками и опубликовать его в теме (сообщение с кнопками). / Create a checklist and post it.", {
    chat_id: chatIdArg,
    name: z.string().min(1).max(100),
    topic: topicArg,
    items: z.array(z.string().min(1).max(300)).max(100).optional().describe("Начальные пункты / initial items"),
  }, async (a) => {
    const chatId = homeChat(c, a.chat_id);
    const threadId = await resolveTopic(c, chatId, a.topic);
    const id = await createList(c, chatId, threadId, a.name.trim(), c.ownerId);
    if (a.items?.length) await addItems(c, id, a.items.map((s) => s.trim()).filter(Boolean), c.ownerId);
    await repostList(c, id);
    const l = (await getList(c, id))!;
    return { list: await listOut(c, l, true), link: l.message_id ? msgLink(chatId, threadId, Number(l.message_id)) : null };
  });

  tool("add_list_items", "Добавить пункты", "Добавить пункты в список (сообщение списка обновится). / Add items to a list.", {
    list_id: z.number().int(),
    items: z.array(z.string().min(1).max(300)).min(1).max(100),
  }, async (a) => {
    const l = await getList(c, a.list_id);
    if (!l) throw new ToolError(`Список #${a.list_id} не найден`);
    await addItems(c, a.list_id, a.items.map((s) => s.trim()).filter(Boolean), c.ownerId);
    if (l.message_id) await refreshList(c, a.list_id); else await repostList(c, a.list_id);
    return { list: await listOut(c, (await getList(c, a.list_id))!, true) };
  });

  tool("toggle_list_item", "Отметить пункт", "Переключить галочку пункта списка (или задать done явно). / Toggle (or set) a list item's checkmark.", {
    item_id: z.number().int(),
    done: z.boolean().optional().describe("Если задано — установить это состояние, иначе переключить"),
  }, async (a) => {
    const it = await c.db.one("SELECT * FROM list_items WHERE id = ?", a.item_id);
    if (!it) throw new ToolError(`Пункт #${a.item_id} не найден`);
    let row: Row | null = it;
    if (a.done === undefined || !!it.done !== a.done) row = await toggleItem(c, a.item_id);
    await refreshList(c, Number(it.list_id));
    return { item: { id: Number(row!.id), list_id: Number(row!.list_id), text: row!.text, done: !!row!.done } };
  });

  // ------------------------------------------------ polls
  tool("create_poll", "Опрос", "Отправить опрос в группу/тему. / Send a poll.", {
    chat_id: chatIdArg,
    question: z.string().min(1).max(300),
    options: z.array(z.string().min(1).max(100)).min(2).max(10),
    topic: topicArg,
    anonymous: z.boolean().optional().describe("Анонимный (default true)"),
    multiple: z.boolean().optional().describe("Несколько ответов (default false)"),
  }, async (a) => {
    const chatId = homeChat(c, a.chat_id);
    const threadId = await resolveTopic(c, chatId, a.topic);
    const params: Record<string, unknown> = {
      chat_id: chatId, question: a.question, options: a.options.map((text) => ({ text })),
      is_anonymous: a.anonymous ?? true, allows_multiple_answers: a.multiple ?? false,
    };
    if (threadId) params.message_thread_id = threadId;
    const m = await c.tg.call<any>("sendPoll", params);
    await c.rememberBotMsg(chatId, threadId, m.message_id);
    return { message_id: m.message_id, link: msgLink(chatId, threadId, m.message_id) };
  });

  // ------------------------------------------------ topics
  tool("list_topics", "Темы", "Известные темы форума (id и название). / Known forum topics.", { chat_id: chatIdArg }, async (a) => {
    const chatId = homeChat(c, a.chat_id);
    const topics = (await knownTopics(c, chatId)).sort((x, y) => x.id - y.id);
    return { chat_id: chatId, topics: [{ id: 0, name: "General" }, ...topics.filter((t) => t.id)].map((t) => ({ ...t, link: t.id ? `https://t.me/c/${String(chatId).replace(/^-100/, "")}/${t.id}` : null })) };
  }, true);

  tool("create_topic", "Создать тему", "Создать тему форума (бот должен быть админом с правом управлять темами). / Create a forum topic.", {
    chat_id: chatIdArg,
    name: z.string().min(1).max(128),
    greet: z.boolean().optional().describe("Написать в новой теме «🧵 Тема создана» (default false)"),
  }, async (a) => {
    const chatId = homeChat(c, a.chat_id);
    const t = await c.tg.call<any>("createForumTopic", { chat_id: chatId, name: a.name.trim() });
    await rememberTopic(c, chatId, t.message_thread_id, t.name);
    if (a.greet) await c.send(chatId, t.message_thread_id, `🧵 Тема «${esc(t.name)}» создана. Пишите здесь!`);
    return { topic_id: t.message_thread_id, name: t.name, link: `https://t.me/c/${String(chatId).replace(/^-100/, "")}/${t.message_thread_id}` };
  });

  tool("rename_topic", "Переименовать тему", "Переименовать тему форума (topic 0 = General). / Rename a forum topic.", {
    chat_id: chatIdArg,
    topic: z.union([z.number().int(), z.string()]).describe("id или текущее название темы"),
    name: z.string().min(1).max(128),
  }, async (a) => {
    const chatId = homeChat(c, a.chat_id);
    const threadId = await resolveTopic(c, chatId, a.topic);
    const name = a.name.trim();
    if (threadId) await c.tg.call("editForumTopic", { chat_id: chatId, message_thread_id: threadId, name });
    else await c.tg.call("editGeneralForumTopic", { chat_id: chatId, name });
    await rememberTopic(c, chatId, threadId, name);
    return { topic_id: threadId, name };
  });

  // ------------------------------------------------ messages
  tool("send_message", "Отправить сообщение", "Отправить сообщение от имени бота. По умолчанию HTML (<b>, <i>, <a href>, <code>); plain=true — обычный текст. / Send a message as the bot.", {
    chat_id: chatIdArg,
    text: z.string().min(1).max(4096),
    topic: topicArg,
    reply_to: z.number().int().optional().describe("message_id, на который ответить"),
    plain: z.boolean().optional().describe("Не разбирать HTML (default false)"),
  }, async (a) => {
    const chatId = homeChat(c, a.chat_id);
    const threadId = await resolveTopic(c, chatId, a.topic);
    const extra: Record<string, unknown> = {};
    if (a.reply_to) extra.reply_parameters = { message_id: a.reply_to, allow_sending_without_reply: true };
    const m = await c.send(chatId, threadId, a.plain ? esc(a.text) : a.text, extra);
    const thread = Number(m?.message_thread_id) || 0;
    return { message_id: m.message_id, topic_id: m?.is_topic_message ? thread : 0, link: msgLink(chatId, m?.is_topic_message ? thread : 0, m.message_id) };
  });

  tool("edit_message", "Изменить сообщение", "Изменить текст сообщения бота (только сообщения, отправленные ботом). / Edit a bot message's text.", {
    chat_id: chatIdArg,
    message_id: z.number().int(),
    text: z.string().min(1).max(4096),
    plain: z.boolean().optional(),
  }, async (a) => {
    const chatId = homeChat(c, a.chat_id);
    await requireBotMsg(c, chatId, a.message_id);
    await c.tg.call("editMessageText", { chat_id: chatId, message_id: a.message_id, text: a.plain ? esc(a.text) : a.text, parse_mode: "HTML", link_preview_options: { is_disabled: true } });
    return { edited: a.message_id };
  });

  tool("delete_message", "Удалить сообщение", "Удалить сообщение бота (только сообщения, отправленные ботом). / Delete a bot message.", {
    chat_id: chatIdArg,
    message_id: z.number().int(),
  }, async (a) => {
    const chatId = homeChat(c, a.chat_id);
    await requireBotMsg(c, chatId, a.message_id);
    await c.tg.call("deleteMessage", { chat_id: chatId, message_id: a.message_id });
    await c.db.run("DELETE FROM bot_msgs WHERE chat_id = ? AND message_id = ?", chatId, a.message_id);
    await c.db.run("UPDATE lists SET message_id = NULL WHERE chat_id = ? AND message_id = ?", chatId, a.message_id);
    return { deleted: a.message_id };
  });

  // ------------------------------------------------ settings
  tool("get_settings", "Настройки", "Настройки модерации и функций группы. / Group settings.", { chat_id: chatIdArg }, async (a) => {
    const chatId = homeChat(c, a.chat_id);
    const s = await c.settings(chatId);
    return {
      chat_id: chatId,
      settings: { ...Object.fromEntries(SETTING_FIELDS.map((k) => [k, (s as any)[k]])), welcome_text: s.welcome_text },
      help: {
        antispam: "антиспам 0/1", antilink: "ссылки от новичков 0/1", antiflood: "антифлуд 0/1", flood_limit: "сообщений за 10 сек (2–50)",
        newbie_hours: "часы «новичка» (0–720)", welcome_enabled: "приветствие 0/1", clean_service: "удалять «вошёл/вышел» 0/1",
        clean_settings: "удалять служебные «изменил настройки группы» 0/1", ai_enabled: "ответы ИИ 0/1", warn_limit: "предупреждений до мута (1–10)",
        welcome_text: "текст приветствия, {name} и {chat}; null = по умолчанию",
      },
    };
  }, true);

  tool("set_setting", "Изменить настройку", `Изменить одну настройку. key: ${SETTING_FIELDS.join(", ")}, welcome_text. Переключатели — 0/1 (или true/false). / Change one setting.`, {
    chat_id: chatIdArg,
    key: z.enum([...SETTING_FIELDS, "welcome_text"] as [string, ...string[]]),
    value: z.union([z.number(), z.boolean(), z.string()]).nullable(),
  }, async (a) => {
    const chatId = homeChat(c, a.chat_id);
    if (a.key === "welcome_text") {
      await setWelcomeText(c, chatId, a.value === null ? null : String(a.value));
      return { key: a.key, value: (await c.settings(chatId)).welcome_text };
    }
    const v = typeof a.value === "boolean" ? (a.value ? 1 : 0) : Number(a.value);
    if (!Number.isFinite(v)) throw new ToolError(`${a.key}: нужно число или true/false`);
    return { key: a.key, value: await setSetting(c, chatId, a.key, v) };
  });

  // ------------------------------------------------ status
  tool("bot_status", "Состояние бота", "Здоровье бота: вебхук (наш ли он, ошибки, очередь), права в группе, счётчики, последний self-heal. Без секретов. / Bot health & webhook info.", { chat_id: chatIdArg }, async (a) => {
    const chatId = homeChat(c, a.chat_id);
    const [info, me, chat, member] = await Promise.all([
      c.tg.try<any>("getWebhookInfo", {}), c.tg.try<any>("getMe", {}), c.tg.try<any>("getChat", { chat_id: chatId }),
      c.tg.try<any>("getChatMember", { chat_id: chatId, user_id: c.botId }),
    ]);
    const counts = await c.db.one(`SELECT
      (SELECT COUNT(*) FROM tasks WHERE chat_id = ?1 AND done = 0) AS open_tasks,
      (SELECT COUNT(*) FROM tasks WHERE chat_id = ?1 AND done = 0 AND reminded = 0 AND COALESCE(remind_at, due_at) IS NOT NULL) AS pending_reminders,
      (SELECT MIN(COALESCE(remind_at, due_at)) FROM tasks WHERE chat_id = ?1 AND done = 0 AND reminded = 0) AS next_reminder,
      (SELECT COUNT(*) FROM lists WHERE chat_id = ?1) AS lists`, chatId);
    const heal = await lastWebhookHeal(c);
    const rights = member ? Object.fromEntries(Object.entries(member).filter(([k]) => k.startsWith("can_"))) : null;
    return {
      ok: !!me && info?.url === webhookUrl(c),
      server_version: VERSION, timezone: c.tz, now: t2s(c, Date.now()),
      bot: me ? { id: me.id, username: me.username } : null,
      webhook: info ? {
        url: info.url || null, is_ours: info.url === webhookUrl(c), expected_url: webhookUrl(c),
        pending_update_count: info.pending_update_count ?? 0, last_error: info.last_error_message ?? null,
        last_error_at: info.last_error_date ? t2s(c, info.last_error_date * 1000) : null, allowed_updates: info.allowed_updates ?? null,
        last_self_heal: heal ? t2s(c, heal) : null,
      } : null,
      chat: chat ? { id: chat.id, title: chat.title, is_forum: !!chat.is_forum } : null,
      bot_member: member ? { status: member.status, rights } : null,
      counts: counts ? { ...counts, next_reminder: t2s(c, counts.next_reminder) } : null,
    };
  }, true);

  return server;
}

/** Handle one /mcp request (already authenticated). Stateless: a fresh server + transport per request. */
export async function handleMcp(c: Ctx, req: Request): Promise<Response> {
  const server = buildServer(c);
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    c.exec?.waitUntil(server.close().catch(() => {}));
  }
}
