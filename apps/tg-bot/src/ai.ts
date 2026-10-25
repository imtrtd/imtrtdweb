import { Ctx } from "./env";

const HISTORY_LIMIT = 20;

export async function recordHistory(c: Ctx, chatId: number, threadId: number, userId: number, name: string, text: string) {
  await c.db.run("INSERT INTO history(chat_id, thread_id, user_id, name, text, is_bot, ts) VALUES (?,?,?,?,?,0,?)",
    chatId, threadId, userId, name.slice(0, 64), text.slice(0, 2000), Date.now());
}

export async function aiReply(c: Ctx, opts: { chatId: number; threadId: number; chatTitle: string; topicName?: string; question: string; askerName: string; quoted?: string }): Promise<string> {
  const rows = await c.db.all(
    "SELECT name, text, is_bot FROM history WHERE chat_id = ? AND thread_id = ? ORDER BY id DESC LIMIT ?",
    opts.chatId, opts.threadId, HISTORY_LIMIT + 1);
  rows.reverse();
  // The last stored row is usually the current question itself; drop it to avoid duplication.
  if (rows.length && !rows[rows.length - 1].is_bot && rows[rows.length - 1].text === opts.question) rows.pop();

  const system =
    `Ты — Grok Assistant, дружелюбный и полезный помощник в Telegram-группе «${opts.chatTitle}»` +
    (opts.topicName ? `, тема «${opts.topicName}»` : "") + ". " +
    "Отвечай на языке собеседника (по умолчанию — по-русски), кратко и по делу: обычно 1–5 предложений. " +
    "Не используй Markdown-разметку (звёздочки, решётки), пиши обычным текстом; списки — через «•». " +
    "Учитывай контекст последних сообщений. Если не знаешь ответа — честно скажи. " +
    `Текущее время: ${new Date().toLocaleString("ru-RU", { timeZone: c.tz })} (Киев). ` +
    "Команды бота: /help, /task, /tasks, /list, /poll, /app.";

  const messages: Array<{ role: string; content: string }> = [{ role: "system", content: system }];
  if (rows.length) {
    const transcript = rows.map((r) => `${r.is_bot ? "Grok Assistant" : r.name}: ${r.text}`).join("\n");
    messages.push({ role: "user", content: `Контекст беседы (последние сообщения):\n${transcript}` });
    messages.push({ role: "assistant", content: "Понял контекст." });
  }
  let q = `${opts.askerName}: ${opts.question}`;
  if (opts.quoted) q = `(в ответ на сообщение: «${opts.quoted.slice(0, 1000)}»)\n` + q;
  messages.push({ role: "user", content: q });

  const models = [c.env.AI_MODEL, c.env.AI_FALLBACK_MODEL].filter(Boolean);
  let lastErr: unknown;
  for (const model of models) {
    try {
      const out: any = await c.env.AI.run(model as any, { messages, max_tokens: 600, temperature: 0.6 } as any);
      const text = (typeof out === "string" ? out : out?.response ?? out?.choices?.[0]?.message?.content ?? "").trim();
      if (text) return text.replace(/\*\*(.+?)\*\*/g, "$1").slice(0, 3900);
    } catch (e) {
      lastErr = e;
      console.warn("AI model failed", model, String((e as Error)?.message ?? e));
    }
  }
  throw lastErr ?? new Error("empty AI response");
}
