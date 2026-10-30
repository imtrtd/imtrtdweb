import type { Lead } from "./http";
import { NOTIFY_TIMEOUT_MS, fetchFailureKind } from "./notify-result";

export function escapeHtml(value: string): string {
	return value
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

export function telegramChatIds(raw: string | undefined): string[] {
	return (raw ?? "")
		.split(",")
		.map((v) => v.trim())
		.filter(Boolean);
}

export function formatLeadMessage(
	lead: Lead,
	source: string,
	adminUrl = "https://admin.imtrtd.space/admin",
): string {
	const lines = [
		"<b>Новая заявка</b>",
		"",
		`<b>Имя:</b> ${escapeHtml(lead.name)}`,
		`<b>Контакт:</b> ${escapeHtml(lead.contact)}`,
	];
	if (lead.task_type) lines.push(`<b>Тип:</b> ${escapeHtml(lead.task_type)}`);
	if (lead.budget) lines.push(`<b>Бюджет:</b> ${escapeHtml(lead.budget)}`);
	if (source) lines.push(`<b>Источник:</b> ${escapeHtml(source)}`);
	lines.push("", lead.message ? escapeHtml(lead.message).slice(0, 3000) : "<i>(без сообщения)</i>");
	const when = new Date(lead.created_at).toLocaleString("ru-RU", {
		timeZone: "Europe/Kyiv",
		dateStyle: "short",
		timeStyle: "short",
	});
	lines.push("", `<b>Время:</b> ${escapeHtml(when)} (Киев)`, `<b>ID:</b> <code>${escapeHtml(lead.id)}</code>`, `<a href="${adminUrl}">Открыть админку</a>`);
	return lines.join("\n");
}

/** `error` is the first failure as a short public-safe code ("telegram_403", "telegram_timeout"). */
export type TelegramResult = { sent: number; bot?: string; error?: string };

/**
 * Sends the lead to every configured chat and reports the sending bot's public username. Never throws.
 * A chat counts as sent only for HTTP 2xx with `{"ok":true}` in the body. Logs status and Telegram
 * error_code only: no token, no chat id, no lead data.
 */
export async function sendTelegram(
	env: { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string },
	lead: Lead,
	source = "",
	fetcher: typeof fetch = fetch,
): Promise<TelegramResult> {
	const token = env.TELEGRAM_BOT_TOKEN?.trim();
	const chats = telegramChatIds(env.TELEGRAM_CHAT_ID);
	if (!token || chats.length === 0) {
		console.log("telegram: not configured, skipped");
		return { sent: 0 };
	}
	const text = formatLeadMessage(lead, source);
	const out: TelegramResult = { sent: 0 };
	const errors: string[] = [];
	await Promise.all(
		chats.map(async (chat_id, i) => {
			let res: Response;
			try {
				res = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ chat_id, text, parse_mode: "HTML", disable_web_page_preview: true }),
					signal: AbortSignal.timeout(NOTIFY_TIMEOUT_MS),
				});
			} catch (err) {
				const kind = fetchFailureKind(err);
				console.error(`telegram sendMessage chat#${i} failed: ${kind}`);
				errors[i] = `telegram_${kind}`;
				return;
			}
			let data: { ok?: boolean; error_code?: number; result?: { from?: { username?: string } } } = {};
			try {
				data = (await res.json()) as typeof data;
			} catch {
				/* non-JSON body */
			}
			if (res.ok && data?.ok === true) {
				out.sent += 1;
				out.bot ??= data.result?.from?.username;
				return;
			}
			const code = typeof data?.error_code === "number" ? data.error_code : res.status;
			console.error(`telegram sendMessage chat#${i} failed: status=${res.status} error_code=${code}`);
			errors[i] = res.ok && typeof data?.error_code !== "number" ? "telegram_bad_response" : `telegram_${code}`;
		}),
	);
	const firstError = errors.find(Boolean);
	if (firstError) out.error = firstError;
	return out;
}

/** Same as sendTelegram, returning only the number of chats reached. */
export async function notifyTelegram(
	env: { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string },
	lead: Lead,
	source = "",
	fetcher: typeof fetch = fetch,
): Promise<number> {
	return (await sendTelegram(env, lead, source, fetcher)).sent;
}
