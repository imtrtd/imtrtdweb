import { Ctx } from "./env";
import { esc, truncate } from "./tg";
import { Row } from "./store";

export async function getList(c: Ctx, id: number) {
  return c.db.one("SELECT * FROM lists WHERE id = ?", id);
}

export async function listItems(c: Ctx, listId: number) {
  return c.db.all("SELECT * FROM list_items WHERE list_id = ? ORDER BY id", listId);
}

export function renderList(list: Row, items: Row[]) {
  const done = items.filter((i) => i.done).length;
  const lines = items.map((it, i) => `${i + 1}. ${it.done ? "✅ <s>" + esc(it.text) + "</s>" : "⬜ " + esc(it.text)}`);
  const text = `📋 <b>${esc(list.name)}</b> <i>#${list.id}</i>\n\n` +
    (lines.length ? lines.join("\n") : "<i>Пока пусто. Добавьте пункт: /list add текст</i>") +
    (items.length ? `\n\nГотово: ${done}/${items.length}` : "");
  const kb = items.slice(0, 60).map((it, i) => [{ text: `${it.done ? "✅" : "⬜"} ${i + 1}. ${truncate(it.text, 32)}`, callback_data: `lt:${it.id}` }]);
  kb.push([{ text: "🔄 Обновить", callback_data: `lr:${list.id}` }]);
  return { text, reply_markup: { inline_keyboard: kb } };
}

/** Re-post the list as a fresh message in its topic (deleting the old copy). */
export async function repostList(c: Ctx, listId: number) {
  const list = await getList(c, listId);
  if (!list) return;
  const items = await listItems(c, listId);
  const r = renderList(list, items);
  if (list.message_id) await c.tg.try("deleteMessage", { chat_id: list.chat_id, message_id: list.message_id });
  const m = await c.send(list.chat_id, list.thread_id, r.text, { reply_markup: r.reply_markup });
  await c.db.run("UPDATE lists SET message_id = ? WHERE id = ?", m.message_id, listId);
}

/** Edit the existing list message in place (used by buttons and the Mini App). */
export async function refreshList(c: Ctx, listId: number) {
  const list = await getList(c, listId);
  if (!list || !list.message_id) return;
  const items = await listItems(c, listId);
  const r = renderList(list, items);
  await c.tg.try("editMessageText", { chat_id: list.chat_id, message_id: list.message_id, text: r.text, parse_mode: "HTML", reply_markup: r.reply_markup });
}

export async function createList(c: Ctx, chatId: number, threadId: number, name: string, userId: number) {
  const r = await c.db.one("INSERT INTO lists(chat_id, thread_id, name, created_by, created_at) VALUES (?,?,?,?,?) RETURNING id", chatId, threadId, name.slice(0, 100), userId, Date.now());
  return Number(r!.id);
}

export async function addItems(c: Ctx, listId: number, texts: string[], userId: number) {
  const now = Date.now();
  await c.db.tx(texts.map((t) => ["INSERT INTO list_items(list_id, text, added_by, created_at) VALUES (?,?,?,?)", [listId, t.slice(0, 300), userId, now]]));
}

export async function toggleItem(c: Ctx, itemId: number): Promise<Row | null> {
  return c.db.one("UPDATE list_items SET done = 1 - done WHERE id = ? RETURNING *", itemId);
}

/** Resolve which list a command refers to: "#id", a name, or the latest list in the topic/chat. */
export async function resolveList(c: Ctx, chatId: number, threadId: number, arg: string): Promise<{ list: Row | null; rest: string }> {
  const m = arg.match(/^#(\d+)\s*(.*)$/s);
  if (m) {
    const list = await c.db.one("SELECT * FROM lists WHERE id = ? AND chat_id = ?", Number(m[1]), chatId);
    return { list, rest: m[2] };
  }
  const named = arg.match(/^([^:\n]{1,60}):\s*(.*)$/s);
  if (named) {
    const list = await c.db.one("SELECT * FROM lists WHERE chat_id = ? AND lower(name) = lower(?) ORDER BY id DESC", chatId, named[1].trim());
    if (list) return { list, rest: named[2] };
  }
  const list = (await c.db.one("SELECT * FROM lists WHERE chat_id = ? AND thread_id = ? ORDER BY id DESC", chatId, threadId))
    ?? (await c.db.one("SELECT * FROM lists WHERE chat_id = ? ORDER BY id DESC", chatId));
  return { list, rest: arg };
}
