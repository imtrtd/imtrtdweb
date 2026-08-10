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
	website?: string;
};

export type LeadPatch = {
	status?: LeadStatus;
	note?: string;
	next_step?: string;
	brief_url?: string;
};

export type LeadStats = {
	total: number;
	week: number;
	new_count: number;
	in_progress: number;
	stale_over_24h: number;
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
		next_step: "",
		brief_url: "",
		first_response_at: null,
		reminded_at: null,
		created_at: ts,
		updated_at: ts,
	};

	await db
		.prepare(
			`INSERT INTO leads
        (id, name, contact, task_type, budget, message, status, note, next_step, brief_url, first_response_at, reminded_at, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
			lead.next_step,
			lead.brief_url,
			lead.first_response_at,
			lead.reminded_at,
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
	patch: LeadPatch,
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
	const nextStep = patch.next_step ?? existing.next_step ?? "";
	const briefUrl = patch.brief_url ?? existing.brief_url ?? "";
	let firstResponse = existing.first_response_at;
	if (!firstResponse && status !== "new" && existing.status === "new") {
		firstResponse = nowIso();
	}

	const updatedAt = nowIso();
	await db
		.prepare(
			`UPDATE leads SET status = ?, note = ?, next_step = ?, brief_url = ?, first_response_at = ?, updated_at = ? WHERE id = ?`,
		)
		.bind(status, note, nextStep, briefUrl, firstResponse, updatedAt, leadId)
		.run();

	return {
		...existing,
		status,
		note,
		next_step: nextStep,
		brief_url: briefUrl,
		first_response_at: firstResponse,
		updated_at: updatedAt,
	};
}

export async function getLeadStats(db: D1Database): Promise<LeadStats> {
	const weekCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
	const staleCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

	const row = await db
		.prepare(
			`SELECT
        COUNT(*) AS total,
        SUM(CASE WHEN created_at >= ? THEN 1 ELSE 0 END) AS week,
        SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END) AS new_count,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
        SUM(CASE WHEN status = 'new' AND created_at <= ? THEN 1 ELSE 0 END) AS stale_over_24h
      FROM leads`,
		)
		.bind(weekCutoff, staleCutoff)
		.first<{
			total: number;
			week: number;
			new_count: number;
			in_progress: number;
			stale_over_24h: number;
		}>();

	return {
		total: Number(row?.total ?? 0),
		week: Number(row?.week ?? 0),
		new_count: Number(row?.new_count ?? 0),
		in_progress: Number(row?.in_progress ?? 0),
		stale_over_24h: Number(row?.stale_over_24h ?? 0),
	};
}

export async function listStaleUnreminded(
	db: D1Database,
	cutoffIso: string,
): Promise<Lead[]> {
	const { results } = await db
		.prepare(
			`SELECT * FROM leads
       WHERE status = 'new'
         AND created_at <= ?
         AND reminded_at IS NULL
       ORDER BY created_at ASC
       LIMIT 50`,
		)
		.bind(cutoffIso)
		.all<Lead>();
	return results ?? [];
}

export async function markReminded(db: D1Database, leadId: string) {
	await db
		.prepare(`UPDATE leads SET reminded_at = ?, updated_at = ? WHERE id = ?`)
		.bind(nowIso(), nowIso(), leadId)
		.run();
}

export async function notifyStudio(env: Env, lead: Lead): Promise<void> {
	await sendStudioEmail(
		env,
		`Новая заявка: ${lead.name}`,
		[
			`Имя: ${lead.name}`,
			`Контакт: ${lead.contact}`,
			`Тип: ${lead.task_type || "—"}`,
			`Бюджет: ${lead.budget || "—"}`,
			"",
			lead.message || "(без сообщения)",
			"",
			`ID: ${lead.id}`,
		].join("\n"),
	);
}

export async function notifyStaleLead(env: Env, lead: Lead): Promise<void> {
	await sendStudioEmail(
		env,
		`Напоминание: заявка без ответа (${lead.name})`,
		[
			`Заявка старше 24 часов всё ещё в статусе new.`,
			"",
			`Имя: ${lead.name}`,
			`Контакт: ${lead.contact}`,
			`Создана: ${lead.created_at}`,
			`ID: ${lead.id}`,
			"",
			"Откройте /admin и ответьте или смените статус.",
		].join("\n"),
	);
}

async function sendStudioEmail(
	env: Env,
	subject: string,
	text: string,
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
			subject,
			text,
		}),
	}).catch(() => {
		/* non-blocking */
	});
}

export async function remindStaleLeads(env: Env): Promise<number> {
	const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
	const stale = await listStaleUnreminded(env.DB, cutoff);
	for (const lead of stale) {
		await notifyStaleLead(env, lead);
		await markReminded(env.DB, lead.id);
	}
	return stale.length;
}
