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
	}
}
