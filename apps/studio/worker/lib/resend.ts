import { NOTIFY_TIMEOUT_MS, codeSlug, fetchFailureKind, type NotifyResult } from "./notify-result";

/**
 * Sender for Resend mail. Must be on a domain verified in Resend — `onboarding@resend.dev` only delivers
 * to the Resend account owner's own address (Resend 403 validation_error). The subdomain keeps Resend's
 * SPF/MX (send.notify.imtrtd.space) away from the Zoho records on the imtrtd.space apex.
 */
export const DEFAULT_RESEND_FROM = "IMTRTD <leads@notify.imtrtd.space>";

export type ResendEnv = { RESEND_API_KEY?: string; RESEND_FROM_EMAIL?: string };

export type ResendMessage = { to: string; subject: string; text: string; replyTo?: string };

/**
 * POST https://api.resend.com/emails. Never throws. Checks the HTTP status and the error body;
 * logs status + Resend error name only (no message text, no recipient, no lead data).
 */
export async function sendResend(
	env: ResendEnv,
	msg: ResendMessage,
	tag: string,
	fetcher: typeof fetch = fetch,
): Promise<NotifyResult> {
	const apiKey = env.RESEND_API_KEY?.trim();
	if (!apiKey) {
		console.log(`resend ${tag}: no RESEND_API_KEY, skipped`);
		return { ok: false, skipped: true };
	}
	const from = (env.RESEND_FROM_EMAIL || DEFAULT_RESEND_FROM).trim();
	let res: Response;
	try {
		res = await fetcher("https://api.resend.com/emails", {
			method: "POST",
			headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
			body: JSON.stringify({
				from,
				to: [msg.to],
				subject: msg.subject,
				text: msg.text,
				...(msg.replyTo ? { reply_to: msg.replyTo } : {}),
			}),
			signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
		});
	} catch (err) {
		const kind = fetchFailureKind(err);
		console.error(`resend ${tag} failed: ${kind}`);
		return { ok: false, error: `resend_${kind}` };
	}
	let data: { id?: string; name?: string; statusCode?: number } = {};
	try {
		data = (await res.json()) as typeof data;
	} catch {
		/* non-JSON body */
	}
	if (!res.ok) {
		console.error(`resend ${tag} failed: status=${res.status} code=${codeSlug(data?.name, "unknown")}`);
		return { ok: false, error: `resend_${res.status}` };
	}
	console.log(`resend ${tag} sent id=${typeof data?.id === "string" ? data.id.slice(0, 64) : "?"}`);
	return { ok: true };
}
