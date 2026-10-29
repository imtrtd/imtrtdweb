import { env } from "cloudflare:test";
import { afterEach, describe, expect, it, vi } from "vitest";
import worker from "../worker/index";

const ON = { ...env, TURNSTILE_SITE_KEY: "test-site-key", TURNSTILE_SECRET_KEY: "test-secret" } as Env;
const HQ = "https://imtrtd.space";
let ipSeq = 0;

function lead(extra: Record<string, unknown> = {}, origin: string | null = HQ) {
	// unique client IP per request so the 5/min rate limit never kicks in during the suite
	const headers: Record<string, string> = {
		"Content-Type": "application/json",
		"CF-Connecting-IP": `198.51.100.${++ipSeq}`,
	};
	if (origin) headers.Origin = origin;
	return new Request("http://example.com/api/leads", {
		method: "POST",
		headers,
		body: JSON.stringify({ name: "Тест", contact: "@test", message: "turnstile", ...extra }),
	});
}

/** Stub only siteverify; everything else (Telegram etc.) goes to the real fetch. */
function stubSiteverify(reply: (() => Response) | Error) {
	const real = globalThis.fetch;
	return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
		const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
		if (url.includes("/turnstile/v0/siteverify")) {
			if (reply instanceof Error) throw reply;
			return reply();
		}
		return real(input as RequestInfo, init);
	});
}

afterEach(() => vi.restoreAllMocks());

describe("turnstile (PSE-22)", () => {
	it("is off without keys: GET config is null and a token-less lead from hq is accepted", async () => {
		const cfg = await worker.fetch(new Request("http://example.com/api/leads"), env);
		expect(await cfg.json()).toEqual({ turnstile: null });
		const res = await worker.fetch(lead(), env);
		expect(res.status).toBe(201);
	});

	it("site key alone (no secret) keeps it off", async () => {
		const only = { ...env, TURNSTILE_SITE_KEY: "k" } as Env;
		expect(await (await worker.fetch(new Request("http://example.com/api/leads"), only)).json()).toEqual({ turnstile: null });
		expect((await worker.fetch(lead(), only)).status).toBe(201);
	});

	it("exposes the site key (never the secret) when on", async () => {
		const res = await worker.fetch(new Request("http://example.com/api/leads", { headers: { Origin: HQ } }), ON);
		const text = await res.text();
		expect(JSON.parse(text)).toEqual({ turnstile: { siteKey: "test-site-key" } });
		expect(text).not.toContain("test-secret");
		expect(res.headers.get("Access-Control-Allow-Origin")).toBe(HQ);
		expect(res.headers.get("Cache-Control")).toBe("no-store");
	});

	it("rejects a token-less lead from imtrtd.space when on", async () => {
		const res = await worker.fetch(lead(), ON);
		expect(res.status).toBe(403);
	});

	it("still accepts token-less leads from the lite site / same-origin studio form unless REQUIRE_ALL", async () => {
		expect((await worker.fetch(lead({}, "https://imtryingtodesign.com"), ON)).status).toBe(201);
		expect((await worker.fetch(lead({}, null), ON)).status).toBe(201);
		const all = { ...ON, TURNSTILE_REQUIRE_ALL: "true" } as Env;
		expect((await worker.fetch(lead({}, "https://imtryingtodesign.com"), all)).status).toBe(403);
	});

	it("accepts a valid token and sends secret + token to siteverify", async () => {
		const spy = stubSiteverify(() => Response.json({ success: true }));
		const res = await worker.fetch(lead({ turnstile_token: "good" }), ON);
		expect(res.status).toBe(201);
		const call = spy.mock.calls.find((c) => String(c[0]).includes("siteverify"))!;
		const body = call[1]!.body as FormData;
		expect(body.get("secret")).toBe("test-secret");
		expect(body.get("response")).toBe("good");
	});

	it("rejects an invalid token", async () => {
		stubSiteverify(() => Response.json({ success: false, "error-codes": ["invalid-input-response"] }));
		expect((await worker.fetch(lead({ turnstile_token: "bad" }), ON)).status).toBe(403);
	});

	it("fails open when siteverify is unreachable or our secret is wrong", async () => {
		stubSiteverify(new TypeError("network down"));
		expect((await worker.fetch(lead({ turnstile_token: "x" }), ON)).status).toBe(201);
		vi.restoreAllMocks();
		stubSiteverify(() => Response.json({ success: false, "error-codes": ["invalid-input-secret"] }));
		expect((await worker.fetch(lead({ turnstile_token: "x" }), ON)).status).toBe(201);
	});

	it("honeypot still wins: silent ok, no siteverify call", async () => {
		const spy = stubSiteverify(() => Response.json({ success: true }));
		const res = await worker.fetch(lead({ website: "spam", turnstile_token: "x" }), ON);
		expect(res.status).toBe(200);
		expect(spy.mock.calls.some((c) => String(c[0]).includes("siteverify"))).toBe(false);
	});
});
