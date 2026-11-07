import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../worker/index";
import { formatLeadEmail, notifyLeadEmail } from "../worker/lib/email";
import { sendTelegram } from "../worker/lib/telegram";
import type { Lead } from "../worker/lib/http";

const lead: Lead = {
	id: "lead_e", name: "Аня\r\nBcc: x@y.z", contact: "anya@example.com", task_type: "Lite site brief", budget: "5k",
	message: "Нужен сайт", status: "new", note: "", next_step: "", brief_url: "",
	first_response_at: null, reminded_at: null, created_at: "2026-10-24T10:00:00.000Z", updated_at: "2026-10-24T10:00:00.000Z",
};

import type { LeadEmailMessage as Sent } from "../worker/lib/email";

describe("lead email", () => {
	it("formats a header-safe subject and a readable body", () => {
		const { subject, text } = formatLeadEmail(lead, "imtryingtodesign.com/");
		expect(subject).not.toMatch(/[\r\n]/);
		expect(subject).toContain("imtryingtodesign.com/");
		expect(text).toContain("Контакт: anya@example.com");
		expect(text).toContain("Бюджет: 5k");
		expect(text).toContain("ID: lead_e");
	});

	it("sends to admin@imtrtd.space with reply-to set to the lead's email", async () => {
		const sent: Sent[] = [];
		const EMAIL = { send: async (m: Sent) => { sent.push(m); return { messageId: "m1" }; } };
		const res = await notifyLeadEmail({ EMAIL }, lead, "imtryingtodesign.com/");
		expect(res.ok).toBe(true);
		const m = sent[0] as { to: string; from: { email: string }; replyTo?: string };
		expect(m.to).toBe("admin@imtrtd.space");
		expect(m.from.email).toBe("leads@imtryingtodesign.com");
		expect(m.replyTo).toBe("anya@example.com");
	});

	it("omits reply-to for a non-email contact and honours overrides", async () => {
		const sent: Sent[] = [];
		const EMAIL = { send: async (m: Sent) => { sent.push(m); return { messageId: "m2" }; } };
		await notifyLeadEmail({ EMAIL, LEAD_NOTIFY_EMAIL: "x@y.co", LEAD_FROM_EMAIL: "a@b.co" }, { ...lead, contact: "@anya" });
		const m = sent[0] as { to: string; replyTo?: string };
		expect(m.to).toBe("x@y.co");
		expect(m.replyTo).toBeUndefined();
	});

	it("is fail-soft: skipped without binding, error result instead of throw", async () => {
		expect(await notifyLeadEmail({}, lead)).toEqual({ ok: false, skipped: true });
		const EMAIL = { send: async () => { throw Object.assign(new Error("sender domain not verified"), { code: "E_SENDER_DOMAIN_NOT_AVAILABLE" }); } };
		const res = await notifyLeadEmail({ EMAIL }, lead);
		expect(res.ok).toBe(false);
		expect(res.error).toBe("cf_email_e_sender_domain_not_available");
	});
});

describe("telegram bot identity", () => {
	it("reports the sending bot's public username", async () => {
		const f = (async () => new Response(JSON.stringify({ ok: true, result: { from: { username: "Bulk_Publish_app" } } }), { status: 200 })) as unknown as typeof fetch;
		const r = await sendTelegram({ TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1" }, lead, "", f);
		expect(r).toEqual({ sent: 1, bot: "Bulk_Publish_app" });
	});
});

describe("POST /api/leads fan-out", () => {
	it("still stores the lead and answers 201 when email sending fails", async () => {
		const e = {
			...env,
			EMAIL: { send: async () => { throw new Error("boom"); } },
		} as unknown as Env;
		const res = await worker.fetch(new Request("http://x/api/leads", { method: "POST", headers: { "Content-Type": "application/json", "CF-Connecting-IP": "10.7.7.7" }, body: JSON.stringify({ name: "Fanout", contact: "a@b.co", message: "hi", source: "t" }) }), e);
		expect(res.status).toBe(201);
		const body = (await res.json()) as { id: string; notified: { email: boolean; telegram: boolean } };
		expect(body.id).toMatch(/^lead_/);
		expect(body.notified).toMatchObject({ email: false, telegram: false });
	});

	it("reports email ok when the binding succeeds", async () => {
		let count = 0;
		const e = { ...env, EMAIL: { send: async () => { count++; return { messageId: "z" }; } } } as unknown as Env;
		const res = await worker.fetch(new Request("http://x/api/leads", { method: "POST", headers: { "Content-Type": "application/json", "CF-Connecting-IP": "10.7.7.8" }, body: JSON.stringify({ name: "Fanout2", contact: "@c", message: "hi" }) }), e);
		expect(res.status).toBe(201);
		expect(((await res.json()) as { notified: { email: boolean } }).notified.email).toBe(true);
		expect(count).toBe(1);
	});
});
