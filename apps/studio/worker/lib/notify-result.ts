/** Outcome of one notification channel. `error` is a short, public-safe code (e.g. "resend_403"), never a message body. */
export type NotifyResult = { ok: boolean; skipped?: boolean; error?: string };

/** Per-request timeout for outbound notification calls (Resend, Telegram). */
export const NOTIFY_TIMEOUT_MS = 8000;

/** Lowercase [a-z0-9_] slug, max 40 chars, for error codes built from provider fields. */
export function codeSlug(value: unknown, fallback = "error"): string {
	const s = String(value ?? "")
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "_")
		.replace(/^_+|_+$/g, "")
		.slice(0, 40);
	return s || fallback;
}

/** "network" or "timeout" for a thrown fetch error. */
export function fetchFailureKind(err: unknown): "timeout" | "network" {
	const name = (err as { name?: string } | null)?.name;
	return name === "TimeoutError" || name === "AbortError" ? "timeout" : "network";
}

/**
 * Public summary of lead notifications. email = at least one email channel (send_email binding or Resend)
 * delivered to its provider; email_error lists failed configured channels, even if another one succeeded.
 */
export function leadNotified(tg: { sent: number; bot?: string; error?: string }, ...mail: NotifyResult[]) {
	const emailErrors = mail.filter((r) => !r.ok && !r.skipped && r.error).map((r) => r.error as string);
	return {
		telegram: tg.sent > 0,
		telegram_bot: tg.bot,
		...(tg.error ? { telegram_error: tg.error } : {}),
		email: mail.some((r) => r.ok),
		...(emailErrors.length ? { email_error: emailErrors.join(",") } : {}),
	};
}
