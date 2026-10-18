import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../worker/index";
import { escapeHtml, formatLeadMessage, notifyTelegram, telegramChatIds } from "../worker/lib/telegram";
import type { Lead } from "../worker/lib/http";

const lead: Lead = {
	id: "lead_x", name: "Аня <b>", contact: "@anya", task_type: "Website", budget: "",
	message: "Нужен сайт & бриф", status: "new", note: "", next_step: "", brief_url: "",
	first_response_at: null, reminded_at: null, created_at: "2026-10-18T12:00:00.000Z", updated_at: "2026-10-18T12:00:00.000Z",
};

describe("telegram", () => {
	it("escapes html and lists fields", () => {
		expect(escapeHtml("<a&b>")).toBe("&lt;a&amp;b&gt;");
		const text = formatLeadMessage(lead, "imtrtd.space/practice");
		expect(text).toContain("Аня &lt;b&gt;");
		expect(text).toContain("Нужен сайт &amp; бриф");
		expect(text).toContain("Источник:</b> imtrtd.space/practice");
		expect(text).not.toContain("Бюджет");
	});

	it("parses comma-separated chat ids", () => {
		expect(telegramChatIds(" 1, -100200 ,,")).toEqual(["1", "-100200"]);
	});

	it("no-ops without env", async () => {
		let called = 0;
		const f = (async () => { called++; return new Response("{}"); }) as unknown as typeof fetch;
		expect(await notifyTelegram({}, lead, "", f)).toBe(0);
		expect(await notifyTelegram({ TELEGRAM_BOT_TOKEN: "t" }, lead, "", f)).toBe(0);
		expect(called).toBe(0);
	});

	it("sends to each chat and swallows failures", async () => {
		const seen: string[] = [];
		const f = (async (_u: string, init: RequestInit) => {
			const id = JSON.parse(String(init.body)).chat_id;
			seen.push(id);
			if (id === "2") throw new Error("down");
			return new Response("{}", { status: id === "3" ? 400 : 200 });
		}) as unknown as typeof fetch;
		const sent = await notifyTelegram({ TELEGRAM_BOT_TOKEN: "t", TELEGRAM_CHAT_ID: "1,2,3" }, lead, "", f);
		expect(seen.sort()).toEqual(["1", "2", "3"]);
		expect(sent).toBe(1);
	});
});

describe("public CORS", () => {
	it("answers preflight for imtrtd.space", async () => {
		const res = await worker.fetch(new Request("http://x/api/leads", { method: "OPTIONS", headers: { Origin: "https://imtrtd.space", "Access-Control-Request-Method": "POST" } }), env);
		expect(res.status).toBe(204);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://imtrtd.space");
	});

	it("refuses unknown origins", async () => {
		const res = await worker.fetch(new Request("http://x/api/leads", { method: "OPTIONS", headers: { Origin: "https://evil.example" } }), env);
		expect(res.status).toBe(403);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBeNull();
	});

	it("creates a lead cross-origin with source, honeypot still silent", async () => {
		const post = (body: object) => worker.fetch(new Request("http://x/api/leads", { method: "POST", headers: { Origin: "https://www.imtrtd.space", "Content-Type": "application/json", "CF-Connecting-IP": "10.9.9.9" }, body: JSON.stringify(body) }), env);
		const ok = await post({ name: "Test", contact: "a@b.co", message: "hi", source: "imtrtd.space/" });
		expect(ok.status).toBe(201);
		expect(ok.headers.get("Access-Control-Allow-Origin")).toBe("https://www.imtrtd.space");
		const bot = await post({ name: "Bot", contact: "x", website: "spam" });
		expect(bot.status).toBe(200);
		expect(((await bot.json()) as { id?: string }).id).toBeUndefined();
		const bad = await post({ name: "", contact: "" });
		expect(bad.status).toBe(400);
	});

	it("serves content with CORS", async () => {
		const res = await worker.fetch(new Request("http://x/api/content", { headers: { Origin: "https://imtrtd.space" } }), env);
		expect(res.status).toBe(200);
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe("https://imtrtd.space");
	});
});

describe("admin services", () => {
	it("creates a service (owner)", async () => {
		const res = await worker.fetch(new Request("http://x/api/admin/services", { method: "POST", headers: { Authorization: `Bearer ${env.ADMIN_TOKEN}`, "Content-Type": "application/json" }, body: JSON.stringify({ title: "Care", description: "Updates after launch.", sort_order: 4 }) }), env);
		expect(res.status).toBe(200);
		expect(((await res.json()) as { title: string }).title).toBe("Care");
	});
});
