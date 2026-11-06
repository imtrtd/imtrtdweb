declare namespace Cloudflare {
	interface Env {
		ADMIN_TOKEN?: string;
		EDITOR_TOKEN?: string;
		RESEND_API_KEY?: string;
		TELEGRAM_BOT_TOKEN?: string;
		TELEGRAM_CHAT_ID?: string;
		EMAIL?: SendEmail;
		LEAD_NOTIFY_EMAIL?: string;
		LEAD_FROM_EMAIL?: string;
		MEDIA?: R2Bucket;
		DB?: D1Database;
		APP_STORE: DurableObjectNamespace<import("./lib/store-do").AppStore>;
		STUDIO_NOTIFY_EMAIL?: string;
		/** Turnstile (PSE-22): public site key (var) + secret (wrangler secret). Both unset = check off. */
		TURNSTILE_SITE_KEY?: string;
		TURNSTILE_SECRET_KEY?: string;
		/** "true" = require a token from every origin, not just imtrtd.space. */
		TURNSTILE_REQUIRE_ALL?: string;
		/** Workers Rate Limiting binding for POST /api/leads (wrangler.jsonc "ratelimits"). Unset = per-isolate fallback. */
		LEAD_RATE_LIMITER?: RateLimit;
	}
}
