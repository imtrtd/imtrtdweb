/**
 * Cloudflare Turnstile for the public lead form (PSE-22).
 *
 * Off by default: the check is only active when BOTH are configured on the studio Worker:
 *   - TURNSTILE_SITE_KEY   (plain var, public; hq reads it from GET /api/leads to render the widget)
 *   - TURNSTILE_SECRET_KEY (secret: `wrangler secret put TURNSTILE_SECRET_KEY`)
 * Without them every lead goes through exactly as before.
 *
 * When active:
 *   - a token, if present, is always verified; an invalid/expired one is rejected (403);
 *   - a missing token is rejected only for requests from imtrtd.space (the hq site renders the widget),
 *     or from anywhere when TURNSTILE_REQUIRE_ALL = "true" (the lite site and the studio form have no widget yet);
 *   - if siteverify itself cannot be reached, the lead is accepted (fail-open): losing a real brief costs more
 *     than one spam message, and the honeypot + rate limit still apply.
 */

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Origins whose form renders the Turnstile widget. */
const WIDGET_ORIGINS = new Set(["https://imtrtd.space", "https://www.imtrtd.space"]);

type TurnstileEnv = {
	TURNSTILE_SITE_KEY?: string;
	TURNSTILE_SECRET_KEY?: string;
	TURNSTILE_REQUIRE_ALL?: string;
};

export function turnstileEnabled(env: TurnstileEnv): boolean {
	return Boolean(env.TURNSTILE_SITE_KEY?.trim() && env.TURNSTILE_SECRET_KEY?.trim());
}

/** Public config for the form: the site key, or null while the feature is off. */
export function turnstilePublicConfig(env: TurnstileEnv): { siteKey: string } | null {
	return turnstileEnabled(env) ? { siteKey: env.TURNSTILE_SITE_KEY!.trim() } : null;
}

export type TurnstileOutcome = "off" | "ok" | "missing" | "invalid" | "unavailable";

export async function verifyTurnstile(
	env: TurnstileEnv,
	token: unknown,
	origin: string | null,
	ip: string,
): Promise<TurnstileOutcome> {
	if (!turnstileEnabled(env)) {
		return "off";
	}
	const value = typeof token === "string" ? token.trim() : "";
	if (!value) {
		const required =
			env.TURNSTILE_REQUIRE_ALL === "true" || (origin !== null && WIDGET_ORIGINS.has(origin));
		return required ? "missing" : "ok";
	}
	if (value.length > 2048) {
		return "invalid";
	}
	const form = new FormData();
	form.append("secret", env.TURNSTILE_SECRET_KEY!.trim());
	form.append("response", value);
	if (ip && ip !== "unknown") {
		form.append("remoteip", ip);
	}
	try {
		const ctl = new AbortController();
		const timer = setTimeout(() => ctl.abort(), 5000);
		const res = await fetch(SITEVERIFY, { method: "POST", body: form, signal: ctl.signal });
		clearTimeout(timer);
		if (!res.ok) {
			console.warn("turnstile siteverify HTTP", res.status);
			return "unavailable";
		}
		const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] };
		if (data.success) {
			return "ok";
		}
		const codes = data["error-codes"] ?? [];
		// Our own misconfiguration (wrong/revoked secret) must not block real leads.
		if (codes.some((c) => c === "invalid-input-secret" || c === "missing-input-secret" || c === "internal-error")) {
			console.error("turnstile misconfigured or failing:", codes.join(","));
			return "unavailable";
		}
		return "invalid";
	} catch (err) {
		console.warn("turnstile siteverify unreachable", err);
		return "unavailable";
	}
}
