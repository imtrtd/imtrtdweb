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

	it("returns stats for owner token", async () => {
		const request = new Request("http://example.com/api/admin/stats", {
			headers: { Authorization: `Bearer ${env.ADMIN_TOKEN}` },
		});
		const response = await worker.fetch(request, env);
		expect(response.status).toBe(200);
		const data = (await response.json()) as { total: number; week: number };
		expect(typeof data.total).toBe("number");
	});

	it("allows editor but forbids delete", async () => {
		const me = await worker.fetch(
			new Request("http://example.com/api/admin/me", {
				headers: { Authorization: `Bearer ${env.EDITOR_TOKEN}` },
			}),
			env,
		);
		expect(me.status).toBe(200);
		const session = (await me.json()) as { role: string };
		expect(session.role).toBe("editor");

		const del = await worker.fetch(
			new Request("http://example.com/api/admin/cases/does-not-exist", {
				method: "DELETE",
				headers: { Authorization: `Bearer ${env.EDITOR_TOKEN}` },
			}),
			env,
		);
		expect(del.status).toBe(403);
	});

	it("updates lead follow-up fields", async () => {
		const create = await worker.fetch(
			new Request("http://example.com/api/leads", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name: "Боря",
					contact: "borya@example.com",
					message: "Бренд",
				}),
			}),
			env,
		);
		const created = (await create.json()) as { id: string };

		const patch = await worker.fetch(
			new Request(`http://example.com/api/admin/leads/${created.id}`, {
				method: "PATCH",
				headers: {
					Authorization: `Bearer ${env.ADMIN_TOKEN}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					status: "in_progress",
					next_step: "Созвон",
					brief_url: "https://example.com/brief",
				}),
			}),
			env,
		);
		expect(patch.status).toBe(200);
		const lead = (await patch.json()) as {
			status: string;
			next_step: string;
			brief_url: string;
			first_response_at: string | null;
		};
		expect(lead.status).toBe("in_progress");
		expect(lead.next_step).toBe("Созвон");
		expect(lead.brief_url).toBe("https://example.com/brief");
		expect(lead.first_response_at).toBeTruthy();
	});
});
