import type { Lead } from "./http";

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

/** Sends the lead to every configured chat. No-op when env vars are unset; never throws. */
export async function notifyTelegram(
	env: { TELEGRAM_BOT_TOKEN?: string; TELEGRAM_CHAT_ID?: string },
	lead: Lead,
	source = "",
	fetcher: typeof fetch = fetch,
): Promise<number> {
	const token = env.TELEGRAM_BOT_TOKEN?.trim();
	const chats = telegramChatIds(env.TELEGRAM_CHAT_ID);
	if (!token || chats.length === 0) {
		console.log("telegram: not configured, skipped");
		return 0;
	}
	const text = formatLeadMessage(lead, source);
	let sent = 0;
	await Promise.all(
		chats.map(async (chat_id) => {
			try {
				const res = await fetcher(`https://api.telegram.org/bot${token}/sendMessage`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ chat_id, text, parse_mode: "HTML", disable_web_page_preview: true }),
				});
				console.log(`telegram sendMessage status=${res.status}`);
				if (res.ok) sent += 1;
				else console.error(`telegram sendMessage failed for ${chat_id}: ${res.status}`);
			} catch (err) {
				console.error("telegram sendMessage error", err);
			}
		}),
	);
	return sent;
}
