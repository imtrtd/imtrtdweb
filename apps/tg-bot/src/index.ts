import { Ctx, Env, setupKey, webhookSecret } from "./env";
import { handleUpdate } from "./bot";
import { handleApi, validateInitData } from "./webapp";
import { runSetup } from "./setup";
import { sendDueReminders } from "./tasks";
import APP_HTML from "./app.html";

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
