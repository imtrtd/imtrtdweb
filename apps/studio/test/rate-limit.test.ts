import { describe, it, expect } from "vitest";
import { checkRateLimit } from "../worker/lib/leads";

function fakeLimiter(allow: number) {
	const seen = new Map<string, number>();
	const keys: string[] = [];
	const limiter = {
		async limit({ key }: { key: string }) {
			keys.push(key);
			const n = (seen.get(key) ?? 0) + 1;
			seen.set(key, n);
			return { success: n <= allow };
		},
	} as unknown as RateLimit;
	return { limiter, keys };
}

describe("lead rate limit", () => {
	it("uses the binding when present, keyed by IP", async () => {
		const { limiter, keys } = fakeLimiter(2);
		expect(await checkRateLimit("203.0.113.7", limiter)).toBe(true);
		expect(await checkRateLimit("203.0.113.7", limiter)).toBe(true);
		expect(await checkRateLimit("203.0.113.7", limiter)).toBe(false);
		expect(await checkRateLimit("203.0.113.8", limiter)).toBe(true);
		expect(keys[0]).toBe("lead:203.0.113.7");
	});

	it("falls back to the in-memory limit (5/min) without a binding", async () => {
		const ip = "198.51.100.42";
		for (let i = 0; i < 5; i++) expect(await checkRateLimit(ip)).toBe(true);
		expect(await checkRateLimit(ip)).toBe(false);
	});

	it("falls back to the in-memory limit when the binding throws", async () => {
		const broken = { limit: async () => { throw new Error("down"); } } as unknown as RateLimit;
		expect(await checkRateLimit("192.0.2.1", broken)).toBe(true);
	});
});
