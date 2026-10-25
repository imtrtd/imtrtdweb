import { Ctx, Env, setupKey, webhookSecret } from "./env";
import { handleUpdate } from "./bot";
import { handleApi, validateInitData } from "./webapp";
import { healWebhook, runSetup } from "./setup";
import { handleMcp } from "./mcp";
import { sendDueReminders } from "./tasks";
import { publishPlan } from "./plan";
import { parseLocalDateTime } from "./time";
import APP_HTML from "./app.html";
import GUIDE_HTML from "./guide.html";

export { BotStore } from "./store";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

const SECURITY_HEADERS = {
  "x-content-type-options": "nosniff",
  "referrer-policy": "no-referrer",
};

export default {
  async fetch(req: Request, env: Env, exec: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const c = new Ctx(env, exec);

    if (url.pathname === "/telegram/webhook" && req.method === "POST") {
      const expected = (await webhookSecret(env)).slice(0, 64);
      if (!safeEqual(req.headers.get("x-telegram-bot-api-secret-token") ?? "", expected)) return new Response("forbidden", { status: 403 });
      let update: any;
      try { update = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
      exec.waitUntil(handleUpdate(c, update).catch((e) => console.error("update failed", update?.update_id, String(e?.message ?? e))));
      return new Response("ok");
    }

    if (url.pathname === "/app" || url.pathname === "/app/") {
      return new Response(APP_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", ...SECURITY_HEADERS } });
    }

    if (url.pathname === "/app/guide" || url.pathname === "/app/guide/" || url.pathname === "/guide") {
      return new Response(GUIDE_HTML, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-cache", ...SECURITY_HEADERS } });
    }

    if (url.pathname.startsWith("/api/")) return handleApi(c, req, url.pathname.slice(5));

    // Debug helper: POST /auth/check with initData body -> {valid}
    if (url.pathname === "/auth/check" && req.method === "POST") {
      const ok = !!(await validateInitData(await req.text(), env.TELEGRAM_BOT_TOKEN));
      return Response.json({ valid: ok }, { status: ok ? 200 : 401 });
    }

    if (url.pathname === "/setup" && req.method === "POST") {
      if (!safeEqual(req.headers.get("x-setup-key") ?? "", await setupKey(env))) return new Response("forbidden", { status: 403 });
      return Response.json(await runSetup(c));
    }

    // Maintainer API (same key as /setup): GET lists tasks of the home group, POST creates a plan (tasks + checklist message).
    if (url.pathname === "/admin/tasks" && (req.method === "GET" || req.method === "POST")) {
      if (!safeEqual(req.headers.get("x-setup-key") ?? "", await setupKey(env))) return new Response("forbidden", { status: 403 });
      const home = Number(env.HOME_CHAT_ID);
      if (req.method === "GET") {
        const rows = await c.db.all("SELECT id, thread_id, text, assignee_name, due_at, remind_at, reminded, done, src_msg_id, created_at FROM tasks WHERE chat_id = ? ORDER BY id DESC LIMIT 100", home);
        return Response.json({ ok: true, tasks: rows });
      }
      let b: any;
      try { b = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
      const local = (v: unknown) => parseLocalDateTime(v, c.tz);
      const tasks = (Array.isArray(b.tasks) ? b.tasks : []).slice(0, 20).map((t: any) => ({
        title: String(t.title ?? "").trim(), due: local(t.due_local), remindAt: local(t.remind_local), assignee: t.assignee ? String(t.assignee) : null,
      })).filter((t: any) => t.title);
      if (!tasks.length) return Response.json({ ok: false, error: "no tasks" }, { status: 400 });
      const editId = Number(b.edit_message_id) || undefined;
      const r = await publishPlan(c, {
        chatId: home, threadId: Number(b.thread_id) || 0, header: String(b.header ?? "📝 План"), srcMsgId: Number(b.src_msg_id) || editId || 0,
        createdBy: Number(env.OWNER_ID), creatorName: String(b.creator_name ?? "Владелец"), tasks, editMessageId: editId,
      });
      return Response.json({ ok: true, message_id: r.messageId, tasks: r.rows.map((t) => ({ id: t.id, text: t.text, due_at: t.due_at, remind_at: t.remind_at, thread_id: t.thread_id })) });
    }

    // Remote MCP server (Streamable HTTP). Auth: "Authorization: Bearer <MCP_KEY>".
    if (url.pathname === "/mcp" || url.pathname === "/mcp/") {
      const key = env.MCP_KEY ?? "";
      if (!key) return Response.json({ error: "MCP is not configured" }, { status: 503 });
      const m = (req.headers.get("authorization") ?? "").match(/^Bearer\s+(.+)$/i);
      if (!m || !safeEqual(m[1].trim(), key)) {
        return Response.json({ jsonrpc: "2.0", error: { code: -32001, message: "Unauthorized" }, id: null }, { status: 401, headers: { "www-authenticate": 'Bearer realm="namenlos-tg-bot-mcp"' } });
      }
      return handleMcp(c, req);
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({ ok: true, bot: "@" + env.BOT_USERNAME, app: env.PUBLIC_URL + "/app" });
    }
    return new Response("not found", { status: 404 });
  },

  async scheduled(_ev: ScheduledController, env: Env, exec: ExecutionContext) {
    const c = new Ctx(env, exec);
    await sendDueReminders(c);
    const now = Date.now();
    const due = await c.db.all("SELECT chat_id, message_id FROM cleanup WHERE delete_at <= ? LIMIT 50", now);
    for (const m of due) {
      await c.tg.try("deleteMessage", { chat_id: m.chat_id, message_id: m.message_id });
      await c.db.run("DELETE FROM cleanup WHERE chat_id = ? AND message_id = ?", m.chat_id, m.message_id);
    }
    // Webhook self-heal check every 5 minutes (the re-set itself is throttled to once per hour).
    if (new Date(now).getUTCMinutes() % 5 === 0) {
      try { await healWebhook(c); } catch (e) { console.warn("webhook heal check failed", String((e as Error).message)); }
    }
    // Housekeeping once an hour
    if (new Date(now).getUTCMinutes() === 0) {
      await c.db.tx([
        ["DELETE FROM history WHERE ts < ?", [now - 14 * 86400_000]],
        ["DELETE FROM bot_msgs WHERE ts < ?", [now - 60 * 86400_000]],
        ["DELETE FROM flood WHERE win < ?", [Math.floor(now / 10_000) - 360]],
      ]);
      // Keep at most ~200 messages per thread
      await c.db.run("DELETE FROM history WHERE id IN (SELECT id FROM (SELECT id, ROW_NUMBER() OVER (PARTITION BY chat_id, thread_id ORDER BY id DESC) AS rn FROM history) WHERE rn > 200)");
    }
  },
} satisfies ExportedHandler<Env>;
