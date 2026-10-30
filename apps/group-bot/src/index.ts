import { Ctx, Env, setupKey, webhookSecret } from "./env";
import { handleUpdate } from "./bot";
import { runSetup, webhookUrl } from "./setup";
import { expireCaptchas } from "./group";
import { sendDueReminders } from "./reminders";

export { GroupStore } from "./store";

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export default {
  async fetch(req: Request, env: Env, exec: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/telegram/webhook" && req.method === "POST") {
      const expected = (await webhookSecret(env)).slice(0, 64);
      if (!safeEqual(req.headers.get("x-telegram-bot-api-secret-token") ?? "", expected)) return new Response("forbidden", { status: 403 });
      let update: any;
      try { update = await req.json(); } catch { return new Response("bad json", { status: 400 }); }
      const c = new Ctx(env, exec);
      exec.waitUntil(handleUpdate(c, update).catch((e) => console.error("update failed", update?.update_id, String(e?.message ?? e))));
      return new Response("ok");
    }

    if (url.pathname === "/setup" && req.method === "POST") {
      if (!safeEqual(req.headers.get("x-setup-key") ?? "", await setupKey(env))) return new Response("forbidden", { status: 403 });
      return Response.json(await runSetup(new Ctx(env, exec)));
    }

    if (url.pathname === "/" || url.pathname === "/health") {
      return Response.json({ ok: true, bot: "@" + env.BOT_USERNAME, webhook: webhookUrl(new Ctx(env)), token: !!env.TELEGRAM_BOT_TOKEN });
    }
    return new Response("not found", { status: 404 });
  },

  async scheduled(_ev: ScheduledController, env: Env, exec: ExecutionContext) {
    const c = new Ctx(env, exec);
    const run = async (name: string, f: () => Promise<unknown>) => { try { await f(); } catch (e) { console.error(name, String((e as Error).message)); } };
    await run("reminders", () => sendDueReminders(c));
    await run("captcha", () => expireCaptchas(c));
    await run("cleanup", async () => {
      const due = await c.db.all<any>("SELECT chat_id, message_id FROM cleanup WHERE delete_at <= ? LIMIT 50", Date.now());
      for (const m of due) {
        await c.tg.try("deleteMessage", { chat_id: m.chat_id, message_id: m.message_id });
        await c.db.run("DELETE FROM cleanup WHERE chat_id = ? AND message_id = ?", m.chat_id, m.message_id);
      }
    });
    if (new Date().getUTCMinutes() === 7) {
      await run("housekeeping", () => c.db.tx([
        ["DELETE FROM flood WHERE rowid IN (SELECT rowid FROM flood LIMIT 5000)", []],
        ["DELETE FROM reminders WHERE done = 1 AND at < ?", [Date.now() - 30 * 86400_000]],
        ["DELETE FROM biz_history WHERE ts < ?", [Date.now() - 30 * 86400_000]],
        ["DELETE FROM cleanup WHERE delete_at < ?", [Date.now() - 86400_000]],
      ]));
    }
  },
} satisfies ExportedHandler<Env>;
