import type { Lead, LeadStatus } from "./http";
import { id, nowIso } from "./http";

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

export const DEFAULT_OUT_FROM = "leads@notify.imtrtd.space";

/** Auto-reply to the client when the contact looks like an email. */
export async function notifyClient(env: Env, lead: Lead): Promise<boolean> {
	const to = lead.contact.trim();
	if (!isEmail(to)) {
		return false;
	}
	const first = lead.name.trim().split(/\s+/)[0] || "there";
	return sendOut(
		env,
		to,
		"Got it. A human reads this next.",
		[
			`Hi ${first},`,
			"",
			"Your message reached the studio. A reply follows within one working day, written by a person, not by whatever wrote this.",
			"",
			"In a hurry: Telegram @imtrtd.",
			"",
			"— I'm Trying To Design",
			"https://imtrtd.space",
		].join("\n"),
		"admin@imtrtd.space",
	);
}

export async function notifyStaleLead(env: Env, lead: Lead): Promise<boolean> {
	const to = (env.STUDIO_NOTIFY_EMAIL || env.LEAD_NOTIFY_EMAIL || "admin@imtrtd.space").trim();
	// Studio inbox is a verified destination: the restricted EMAIL binding sends there on any plan.
	return sendOut(
		env,
		to,
		`Напоминание: заявка без ответа (${lead.name.replace(/[\r\n]+/g, " ").slice(0, 80)})`,
		[
			"Заявка старше 24 часов всё ещё в статусе new.",
			"",
			`Имя: ${lead.name}`,
			`Контакт: ${lead.contact}`,
			`Создана: ${lead.created_at}`,
			`ID: ${lead.id}`,
			"",
			"https://admin.imtrtd.space/admin",
		].join("\n"),
		undefined,
		"studio",
	);
}

/** Sends via the unrestricted `MAIL_OUT` binding (Cloudflare Email Sending). Fail-soft. */
async function sendOut(
	env: Env,
	to: string,
	subject: string,
	text: string,
	replyTo?: string,
	via: "out" | "studio" = "out",
): Promise<boolean> {
	const binding = via === "studio" ? env.EMAIL : env.MAIL_OUT;
	if (!binding) {
		return false;
	}
	const from =
		via === "studio"
			? (env.LEAD_FROM_EMAIL || "leads@imtryingtodesign.com").trim()
			: (env.OUT_FROM_EMAIL || DEFAULT_OUT_FROM).trim();
	try {
		await binding.send({
			to,
			from: { email: from, name: "I'm Trying To Design" },
			subject,
			text,
			...(replyTo ? { replyTo } : {}),
		});
		return true;
	} catch (err) {
		console.error("mail out failed", (err as Error)?.message ?? String(err));
		return false;
	}
}

export async function remindStaleLeads(env: Env): Promise<number> {
	const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
	const stale = await listStaleUnreminded(env.DB, cutoff);
	let sent = 0;
	for (const lead of stale) {
		if (await notifyStaleLead(env, lead)) {
			await markReminded(env.DB, lead.id);
			sent++;
		}
	}
	return sent;
}
