import { env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../worker/index";
import type { Lead } from "../worker/lib/http";
import { notifyClient, remindStaleLeads } from "../worker/lib/leads";
import { leadNotified } from "../worker/lib/notify-result";
import { DEFAULT_RESEND_FROM, sendResend } from "../worker/lib/resend";
import { sendTelegram } from "../worker/lib/telegram";

const lead: Lead = {
	id: "lead_n", name: "Аня", contact: "anya@example.com", task_type: "", budget: "",
	message: "Секретный текст заявки", status: "new", note: "", next_step: "", brief_url: "",
	first_response_at: null, reminded_at: null, created_at: "2026-10-30T07:30:00.000Z", updated_at: "2026-10-30T07:30:00.000Z",
};

const jsonRes = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

/** Everything written to console.error/log during fn, joined. */
async function captureLogs<T>(fn: () => Promise<T>): Promise<{ out: T; logs: string }> {
	const lines: string[] = [];
	const push = (...a: unknown[]) => { lines.push(a.map(String).join(" ")); };
	const e = vi.spyOn(console, "error").mockImplementation(push);
	const l = vi.spyOn(console, "log").mockImplementation(push);
	try {
		return { out: await fn(), logs: lines.join("\n") };
	} finally {
		e.mockRestore();
		l.mockRestore();
	}
}

afterEach(() => vi.restoreAllMocks());

describe("sendResend", () => {
	const msg = { to: "admin@imtrtd.space", subject: "s", text: "Секретный текст заявки", replyTo: "anya@example.com" };

	it("skips without an API key and never calls fetch", async () => {
		const f = vi.fn();
		expect(await sendResend({}, msg, "t", f as unknown as typeof fetch)).toEqual({ ok: false, skipped: true });
		expect(f).not.toHaveBeenCalled();
	});

	it("ok on 200 and sends from the verified-domain default", async () => {
		let body: Record<string, unknown> = {};
		const f = (async (_u: string, init: RequestInit) => { body = JSON.parse(String(init.body)); return jsonRes({ id: "re_1" }); }) as unknown as typeof fetch;
		expect(await sendResend({ RESEND_API_KEY: "k" }, msg, "t", f)).toEqual({ ok: true });
		expect(body.from).toBe(DEFAULT_RESEND_FROM);
		expect(body.from).not.toContain("resend.dev");
		expect(body.to).toEqual(["admin@imtrtd.space"]);
		expect(body.reply_to).toBe("anya@example.com");
	});

	it("honours RESEND_FROM_EMAIL", async () => {
		let from = "";
		const f = (async (_u: string, init: RequestInit) => { from = JSON.parse(String(init.body)).from; return jsonRes({ id: "re_2" }); }) as unknown as typeof fetch;
		await sendResend({ RESEND_API_KEY: "k", RESEND_FROM_EMAIL: "X <x@notify.example.com>" }, msg, "t", f);
		expect(from).toBe("X <x@notify.example.com>");
	});

	it("reports resend_403 on the resend.dev testing-only error, logging status+code without secrets or lead data", async () => {
		const f = (async () => jsonRes({ statusCode: 403, name: "validation_error", message: "You can only send testing emails to your own email address (owner@example.org)." }, 403)) as unknown as typeof fetch;
		const { out, logs } = await captureLogs(() => sendResend({ RESEND_API_KEY: "re_secret_key" }, msg, "studio", f));
		expect(out).toEqual({ ok: false, error: "resend_403" });
		expect(logs).toContain("status=403");
		expect(logs).toContain("code=validation_error");
		for (const leak of ["re_secret_key", "owner@example.org", "anya@example.com", "admin@imtrtd.space", "Секретный"]) expect(logs).not.toContain(leak);
	});

	it("reports resend_network / resend_timeout when fetch throws", async () => {
		const down = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
		expect(await sendResend({ RESEND_API_KEY: "k" }, msg, "t", down)).toEqual({ ok: false, error: "resend_network" });
		const slow = (async () => { throw new DOMException("timed out", "TimeoutError"); }) as unknown as typeof fetch;
		expect(await sendResend({ RESEND_API_KEY: "k" }, msg, "t", slow)).toEqual({ ok: false, error: "resend_timeout" });
	});
});

describe("sendTelegram result checks", () => {
	const tgEnv = { TELEGRAM_BOT_TOKEN: "123:SECRET", TELEGRAM_CHAT_ID: "-100777" };

	it("counts a chat only for ok:true", async () => {
		const f = (async () => jsonRes({ ok: true, result: { from: { username: "imtrtd_bot" } } })) as unknown as typeof fetch;
		expect(await sendTelegram(tgEnv, lead, "", f)).toEqual({ sent: 1, bot: "imtrtd_bot" });
	});

	it("reports telegram_<error_code> and logs status without token, chat id or lead data", async () => {
		const f = (async () => jsonRes({ ok: false, error_code: 403, description: "Forbidden: bot was blocked by the user" }, 403)) as unknown as typeof fetch;
		const { out, logs } = await captureLogs(() => sendTelegram(tgEnv, lead, "", f));
		expect(out).toEqual({ sent: 0, error: "telegram_403" });
		expect(logs).toContain("status=403");
		expect(logs).toContain("error_code=403");
		for (const leak of ["SECRET", "-100777", "anya@example.com", "Секретный"]) expect(logs).not.toContain(leak);
	});

	it("treats HTTP 200 without ok:true as a failure", async () => {
		const f = (async () => new Response("<html>proxy</html>", { status: 200 })) as unknown as typeof fetch;
		expect(await sendTelegram(tgEnv, lead, "", f)).toEqual({ sent: 0, error: "telegram_bad_response" });
	});

	it("reports telegram_network when fetch throws", async () => {
		const f = (async () => { throw new TypeError("fetch failed"); }) as unknown as typeof fetch;
		expect(await sendTelegram(tgEnv, lead, "", f)).toEqual({ sent: 0, error: "telegram_network" });
	});
});

describe("leadNotified", () => {
	it("email is true if any channel delivered; failed configured channels are listed, skipped ones are not", () => {
		expect(leadNotified({ sent: 1, bot: "b" }, { ok: true }, { ok: false, error: "resend_403" })).toEqual({
			telegram: true, telegram_bot: "b", email: true, email_error: "resend_403",
		});
		expect(leadNotified({ sent: 0, error: "telegram_401" }, { ok: false, skipped: true }, { ok: false, skipped: true })).toEqual({
			telegram: false, telegram_bot: undefined, telegram_error: "telegram_401", email: false,
		});
	});
});

describe("POST /api/leads with real notification outcomes (fetch mocked)", () => {
	const post = (ip: string, e: Env) =>
		worker.fetch(
			new Request("http://x/api/leads", {
				method: "POST",
				headers: { "Content-Type": "application/json", "CF-Connecting-IP": ip },
				body: JSON.stringify({ name: "Notify", contact: "@handle", message: "hi" }),
			}),
			e,
		);
	const base = () => ({ ...env, RESEND_API_KEY: "re_k", TELEGRAM_BOT_TOKEN: "1:T", TELEGRAM_CHAT_ID: "5", EMAIL: undefined }) as unknown as Env;

	it("success: 201 with telegram/email true and no error codes", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
			const url = String(input instanceof Request ? input.url : input);
			if (url.startsWith("https://api.resend.com/")) return jsonRes({ id: "re_ok" });
			if (url.startsWith("https://api.telegram.org/")) return jsonRes({ ok: true, result: { from: { username: "bot" } } });
			throw new Error(`unexpected fetch ${url}`);
		});
		const res = await post("10.9.9.1", base());
		expect(res.status).toBe(201);
		const body = (await res.json()) as { id: string; notified: Record<string, unknown> };
		expect(body.id).toMatch(/^lead_/);
		expect(body.notified).toEqual({ telegram: true, telegram_bot: "bot", email: true });
	});

	it("failure: lead still stored, 201, real false results plus short codes only", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
			const url = String(input instanceof Request ? input.url : input);
			if (url.startsWith("https://api.resend.com/")) return jsonRes({ statusCode: 403, name: "validation_error", message: "testing only (owner@x.y)" }, 403);
			if (url.startsWith("https://api.telegram.org/")) return jsonRes({ ok: false, error_code: 401, description: "Unauthorized" }, 401);
			throw new Error(`unexpected fetch ${url}`);
		});
		const { out: res } = await captureLogs(() => post("10.9.9.2", base()));
		expect(res.status).toBe(201);
		const text = await res.text();
		const body = JSON.parse(text) as { ok: boolean; id: string; notified: Record<string, unknown> };
		expect(body.ok).toBe(true);
		expect(body.notified).toMatchObject({ telegram: false, telegram_error: "telegram_401", email: false, email_error: "resend_403" });
		for (const leak of ["owner@x.y", "Unauthorized", "validation_error", "testing only"]) expect(text).not.toContain(leak);
		const stored = await worker.fetch(new Request("http://x/api/admin/leads", { headers: { Authorization: "Bearer dev-admin-token" } }), env);
		expect(stored.status).toBe(200);
		expect(JSON.stringify(await stored.json())).toContain(body.id);
	});
});

describe("stale reminders and client auto-reply (Bugbot)", () => {
	/** Minimal D1 stand-in: one stale lead; records UPDATE (markReminded) calls. */
	function fakeDb(marked: string[]) {
		return {
			prepare(sql: string) {
				return {
					bind(...args: unknown[]) {
						return {
							all: async () => ({ results: [lead] }),
							run: async () => { if (sql.startsWith("UPDATE")) marked.push(String(args[2])); return {}; },
						};
					},
				};
			},
		} as unknown as D1Database;
	}
	const mk = (marked: string[], extra: Partial<Env> = {}) => ({ ...env, DB: fakeDb(marked), ...extra }) as unknown as Env;

	it("does not mark a lead reminded when the Resend send fails, so the next run retries", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonRes({ statusCode: 500, name: "internal_server_error" }, 500));
		const marked: string[] = [];
		const { out } = await captureLogs(() => remindStaleLeads(mk(marked, { RESEND_API_KEY: "k" })));
		expect(out).toBe(0);
		expect(marked).toEqual([]);
	});

	it("marks on success, and when email is not configured (skipped)", async () => {
		vi.spyOn(globalThis, "fetch").mockImplementation(async () => jsonRes({ id: "re_s" }));
		const ok: string[] = [];
		expect(await remindStaleLeads(mk(ok, { RESEND_API_KEY: "k" }))).toBe(1);
		expect(ok).toEqual(["lead_n"]);
		const skipped: string[] = [];
		expect(await remindStaleLeads(mk(skipped, { RESEND_API_KEY: undefined }))).toBe(1);
		expect(skipped).toEqual(["lead_n"]);
	});

	it("client auto-reply sets reply_to to the studio inbox (From subdomain is send-only)", async () => {
		let body: Record<string, unknown> = {};
		vi.spyOn(globalThis, "fetch").mockImplementation(async (_u, init) => { body = JSON.parse(String(init?.body)); return jsonRes({ id: "re_c" }); });
		expect(await notifyClient({ ...env, RESEND_API_KEY: "k" } as unknown as Env, lead)).toEqual({ ok: true });
		expect(body.to).toEqual(["anya@example.com"]);
		expect(body.reply_to).toBe("admin@imtrtd.space");
	});
});
