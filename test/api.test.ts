import { env } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../worker/index";

describe("studio API", () => {
	it("returns public content", async () => {
		const request = new Request("http://example.com/api/content");
		const response = await worker.fetch(request, env);
		expect(response.status).toBe(200);
		const data = (await response.json()) as {
			copy: Record<string, string>;
		};
		expect(data.copy.brand).toBeTruthy();
	});

	it("creates a lead", async () => {
		const request = new Request("http://example.com/api/leads", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				name: "Аня",
				contact: "@anya",
				task_type: "Лендинг",
				message: "Нужен сайт студии",
			}),
		});
		const response = await worker.fetch(request, env);
		expect(response.status).toBe(201);
		const data = (await response.json()) as { ok: boolean; id: string };
		expect(data.ok).toBe(true);
		expect(data.id).toMatch(/^lead_/);
	});

	it("rejects admin without token", async () => {
		const request = new Request("http://example.com/api/admin/leads");
		const response = await worker.fetch(request, env);
		expect(response.status).toBe(401);
	});
});
