import type { Lead, LeadStatus } from "./http";
import { id, nowIso } from "./http";

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;
const rateMap = new Map<string, { count: number; reset: number }>();

export function checkRateLimit(ip: string): boolean {
	const now = Date.now();
	const entry = rateMap.get(ip);
	if (!entry || now > entry.reset) {
		rateMap.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
		return true;
	}
	if (entry.count >= RATE_LIMIT) {
		return false;
	}
	entry.count += 1;
	return true;
}

export type CreateLeadInput = {
	name: string;
	contact: string;
	task_type?: string;
	budget?: string;
	message?: string;
	website?: string; // honeypot
};

export function validateLead(body: CreateLeadInput): string | null {
	if (body.website) {
		return "rejected";
	}
	if (!body.name?.trim() || body.name.trim().length > 120) {
		return "Укажите имя";
	}
	if (!body.contact?.trim() || body.contact.trim().length > 200) {
		return "Укажите контакт (Telegram или email)";
	}
	if ((body.message ?? "").length > 4000) {
		return "Сообщение слишком длинное";
	}
	return null;
}

export async function createLead(
	db: D1Database,
	input: CreateLeadInput,
): Promise<Lead> {
	const leadId = id("lead");
	const ts = nowIso();
	const lead: Lead = {
		id: leadId,
		name: input.name.trim(),
		contact: input.contact.trim(),
		task_type: (input.task_type ?? "").trim().slice(0, 120),
		budget: (input.budget ?? "").trim().slice(0, 120),
		message: (input.message ?? "").trim().slice(0, 4000),
		status: "new",
		note: "",
		first_response_at: null,
		created_at: ts,
		updated_at: ts,
	};

	await db
		.prepare(
			`INSERT INTO leads
        (id, name, contact, task_type, budget, message, status, note, first_response_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			lead.id,
			lead.name,
			lead.contact,
			lead.task_type,
			lead.budget,
			lead.message,
			lead.status,
			lead.note,
			lead.first_response_at,
			lead.created_at,
			lead.updated_at,
		)
		.run();

	return lead;
}

export async function listLeads(
	db: D1Database,
	status?: string,
): Promise<Lead[]> {
	if (status) {
		const { results } = await db
			.prepare(
				`SELECT * FROM leads WHERE status = ? ORDER BY created_at DESC LIMIT 200`,
			)
			.bind(status)
			.all<Lead>();
		return results ?? [];
	}
	const { results } = await db
		.prepare(`SELECT * FROM leads ORDER BY created_at DESC LIMIT 200`)
		.all<Lead>();
	return results ?? [];
}

export async function updateLead(
	db: D1Database,
	leadId: string,
	patch: { status?: LeadStatus; note?: string },
): Promise<Lead | null> {
	const existing = await db
		.prepare(`SELECT * FROM leads WHERE id = ?`)
		.bind(leadId)
		.first<Lead>();
	if (!existing) {
		return null;
	}

	const status = patch.status ?? existing.status;
	const note = patch.note ?? existing.note;
	let firstResponse = existing.first_response_at;
	if (
		!firstResponse &&
		status !== "new" &&
		existing.status === "new"
	) {
		firstResponse = nowIso();
	}

	const updatedAt = nowIso();
	await db
		.prepare(
			`UPDATE leads SET status = ?, note = ?, first_response_at = ?, updated_at = ? WHERE id = ?`,
		)
		.bind(status, note, firstResponse, updatedAt, leadId)
		.run();

	return {
		...existing,
		status,
		note,
		first_response_at: firstResponse,
		updated_at: updatedAt,
	};
}

export async function notifyStudio(
	env: Env,
	lead: Lead,
): Promise<void> {
	const apiKey = env.RESEND_API_KEY;
	const to = env.STUDIO_NOTIFY_EMAIL;
	if (!apiKey || !to) {
		return;
	}

	await fetch("https://api.resend.com/emails", {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from: "IMTRTD <onboarding@resend.dev>",
			to: [to],
			subject: `Новая заявка: ${lead.name}`,
			text: [
				`Имя: ${lead.name}`,
				`Контакт: ${lead.contact}`,
				`Тип: ${lead.task_type || "—"}`,
				`Бюджет: ${lead.budget || "—"}`,
				"",
				lead.message || "(без сообщения)",
				"",
				`ID: ${lead.id}`,
			].join("\n"),
		}),
	}).catch(() => {
		/* non-blocking */
	});
}
