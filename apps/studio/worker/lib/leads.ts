import type { Lead, LeadStatus } from "./http";
import { id, nowIso } from "./http";
import type { NotifyResult } from "./notify-result";
import { sendResend } from "./resend";

const RATE_WINDOW_MS = 60_000;
const RATE_LIMIT = 5;
const rateMap = new Map<string, { count: number; reset: number }>();

/** Per-isolate fallback: only used when the LEAD_RATE_LIMITER binding is missing (local tests, old config). */
function checkRateLimitLocal(ip: string): boolean {
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

/**
 * 5 lead POSTs per IP per minute. Uses the Workers Rate Limiting binding (shared across isolates
 * in a Cloudflare location) when bound; if the binding is missing or errors, falls back to the
 * in-memory per-isolate map so the form never fails closed.
 */
export async function checkRateLimit(ip: string, limiter?: RateLimit): Promise<boolean> {
	if (limiter) {
		try {
			const { success } = await limiter.limit({ key: `lead:${ip}` });
			return success;
		} catch {
			// fall through to the local map
		}
	}
	return checkRateLimitLocal(ip);
}

export type CreateLeadInput = {
	name: string;
	contact: string;
	task_type?: string;
	budget?: string;
	message?: string;
	website?: string;
	/** Page the lead was sent from (not stored as a column; appended to the message). */
	source?: string;
	/** Cloudflare Turnstile token from the hq form (verified, never stored). */
	turnstile_token?: string;
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
	if (body.source !== undefined && typeof body.source !== "string") {
		return "invalid source";
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

function isEmail(value: string): boolean {
	return /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/.test(value);
}

/** Header-safe single line for subjects. */
function oneLine(value: string, max = 80): string {
	return value.replace(/[\r\n]+/g, " ").trim().slice(0, max);
}

/** Lead notification to the studio inbox (STUDIO_NOTIFY_EMAIL) via Resend. */
export async function notifyStudio(env: Env, lead: Lead): Promise<NotifyResult> {
	const to = env.STUDIO_NOTIFY_EMAIL?.trim();
	if (!to) {
		return { ok: false, skipped: true };
	}
	return sendResend(
		env,
		{
			to,
			subject: `Новая заявка: ${oneLine(lead.name)}`,
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
			...(isEmail(lead.contact.trim()) ? { replyTo: lead.contact.trim() } : {}),
		},
		"studio",
	);
}

/** Auto-reply to the client when contact looks like an email. */
export async function notifyClient(env: Env, lead: Lead): Promise<NotifyResult> {
	const to = lead.contact.trim();
	if (!isEmail(to)) {
		return { ok: false, skipped: true };
	}
	// The From subdomain is send-only (no inbox), so client replies go to the studio inbox.
	const studio = env.STUDIO_NOTIFY_EMAIL?.trim();
	return sendResend(
		env,
		{
			to,
			subject: "Заявка получена — I'm Trying To Design",
			text: [
				`Здравствуйте, ${lead.name}!`,
				"",
				"Мы получили вашу заявку и ответим в течение одного рабочего дня.",
				"",
				"Если срочно — напишите в Telegram: @imtrtd",
				"",
				"— I'm Trying To Design",
			].join("\n"),
			...(studio && isEmail(studio) ? { replyTo: studio } : {}),
		},
		"client",
	);
}

export async function notifyStaleLead(env: Env, lead: Lead): Promise<NotifyResult> {
	const to = env.STUDIO_NOTIFY_EMAIL?.trim();
	if (!to) {
		return { ok: false, skipped: true };
	}
	return sendResend(
		env,
		{
			to,
			subject: `Напоминание: заявка без ответа (${oneLine(lead.name)})`,
			text: [
				`Заявка старше 24 часов всё ещё в статусе new.`,
				"",
				`Имя: ${lead.name}`,
				`Контакт: ${lead.contact}`,
				`Создана: ${lead.created_at}`,
				`ID: ${lead.id}`,
				"",
				"Откройте /admin и ответьте или смените статус.",
			].join("\n"),
		},
		"stale",
	);
}

export async function remindStaleLeads(env: Env): Promise<number> {
	const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
	const stale = await listStaleUnreminded(env.DB, cutoff);
	let reminded = 0;
	for (const lead of stale) {
		const res = await notifyStaleLead(env, lead);
		// A failed send (Resend 4xx/5xx, timeout) stays unmarked so the next hourly run retries it.
		// "skipped" (no RESEND_API_KEY / recipient) is marked as before, so enabling email later
		// does not fire a burst of reminders for old leads.
		if (res.ok || res.skipped) {
			await markReminded(env.DB, lead.id);
			reminded += 1;
		}
	}
	return reminded;
}
