import type { Lead } from "./http";

export const DEFAULT_LEAD_TO = "admin@imtrtd.space";
// Must be an address on a zone that has Cloudflare Email Routing enabled (imtryingtodesign.com) or an onboarded Email Service domain.
export const DEFAULT_LEAD_FROM = "leads@imtryingtodesign.com";

export type LeadEmailMessage = {
	to: string;
	from: { email: string; name: string };
	subject: string;
	text: string;
	replyTo?: string;
};

export type LeadEmailEnv = {
	EMAIL?: { send(message: LeadEmailMessage): Promise<{ messageId?: string } | void> };
	LEAD_NOTIFY_EMAIL?: string;
	LEAD_FROM_EMAIL?: string;
};

export type EmailResult = { ok: boolean; skipped?: boolean; error?: string };

function isEmail(value: string): boolean {
	return /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value);
}

/** Header-safe single line. */
function oneLine(value: string, max = 120): string {
	return value.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

export function formatLeadEmail(lead: Lead, source: string): { subject: string; text: string } {
	const subject = `Новая заявка: ${oneLine(lead.name, 80)}${source ? ` · ${oneLine(source, 60)}` : ""}`;
	const text = [
		"Новая заявка с сайта",
		"",
		`Имя: ${lead.name}`,
		`Контакт: ${lead.contact}`,
		lead.task_type ? `Тип: ${lead.task_type}` : "",
		lead.budget ? `Бюджет: ${lead.budget}` : "",
		source ? `Источник: ${source}` : "",
		"",
		lead.message || "(без сообщения)",
		"",
		`Время (UTC): ${lead.created_at}`,
		`ID: ${lead.id}`,
		"Админка: https://admin.imtrtd.space/admin",
	]
		.filter((line, i, all) => line !== "" || (all[i - 1] !== "" && i > 0))
		.join("\n");
	return { subject, text };
}

/**
 * Emails the lead to the studio inbox via the Workers `send_email` binding.
 * Fail-soft: never throws, so lead storage and Telegram are never blocked by it.
 */
export async function notifyLeadEmail(env: LeadEmailEnv, lead: Lead, source = ""): Promise<EmailResult> {
	if (!env.EMAIL) {
		console.log("lead email: no send_email binding, skipped");
		return { ok: false, skipped: true };
	}
	const to = (env.LEAD_NOTIFY_EMAIL || DEFAULT_LEAD_TO).trim();
	const from = (env.LEAD_FROM_EMAIL || DEFAULT_LEAD_FROM).trim();
	const { subject, text } = formatLeadEmail(lead, source);
	const contact = lead.contact.trim();
	try {
		const res = await env.EMAIL.send({
			to,
			from: { email: from, name: "IMTRTD leads" },
			subject,
			text,
			...(isEmail(contact) ? { replyTo: contact } : {}),
		});
		console.log(`lead email sent id=${(res && res.messageId) || "?"}`);
		return { ok: true };
	} catch (err) {
		const e = err as { code?: string; message?: string };
		const error = `${e?.code ?? "error"}: ${(e?.message ?? String(err)).slice(0, 200)}`;
		console.error("lead email failed", error);
		return { ok: false, error };
	}
}
