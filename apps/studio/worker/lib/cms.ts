import type { CaseItem, ServiceItem, SiteContent } from "./http";
import { id, nowIso } from "./http";

export async function getPublicContent(db: D1Database): Promise<SiteContent> {
	const [copyRows, cases, services] = await Promise.all([
		db.prepare(`SELECT key, value FROM site_copy`).all<{ key: string; value: string }>(),
		db
			.prepare(
				`SELECT * FROM cases WHERE published = 1 ORDER BY sort_order ASC, created_at DESC`,
			)
			.all<CaseItem>(),
		db
			.prepare(
				`SELECT * FROM services WHERE published = 1 ORDER BY sort_order ASC, created_at DESC`,
			)
			.all<ServiceItem>(),
	]);

	const copy: Record<string, string> = {};
	for (const row of copyRows.results ?? []) {
		copy[row.key] = row.value;
	}

	return {
		copy,
		cases: cases.results ?? [],
		services: services.results ?? [],
	};
}

export async function getAdminContent(db: D1Database): Promise<SiteContent> {
	const [copyRows, cases, services] = await Promise.all([
		db.prepare(`SELECT key, value FROM site_copy`).all<{ key: string; value: string }>(),
		db
			.prepare(`SELECT * FROM cases ORDER BY sort_order ASC, created_at DESC`)
			.all<CaseItem>(),
		db
			.prepare(`SELECT * FROM services ORDER BY sort_order ASC, created_at DESC`)
			.all<ServiceItem>(),
	]);

	const copy: Record<string, string> = {};
	for (const row of copyRows.results ?? []) {
		copy[row.key] = row.value;
	}

	return {
		copy,
		cases: cases.results ?? [],
		services: services.results ?? [],
	};
}

export async function upsertCopy(
	db: D1Database,
	entries: Record<string, string>,
): Promise<void> {
	const ts = nowIso();
	const statements = Object.entries(entries).map(([key, value]) =>
		db
			.prepare(
				`INSERT INTO site_copy (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
			)
			.bind(key, value, ts),
	);
	await db.batch(statements);
}

export async function upsertCase(
	db: D1Database,
	input: Partial<CaseItem> & { title: string },
): Promise<CaseItem> {
	const ts = nowIso();
	const caseId = input.id || id("case");
	const existing = input.id
		? await db
				.prepare(`SELECT * FROM cases WHERE id = ?`)
				.bind(input.id)
				.first<CaseItem>()
		: null;

	const row: CaseItem = {
		id: caseId,
		title: input.title.trim(),
		role: (input.role ?? existing?.role ?? "").trim(),
		result: (input.result ?? existing?.result ?? "").trim(),
		image_url: (input.image_url ?? existing?.image_url ?? "").trim(),
		sort_order: input.sort_order ?? existing?.sort_order ?? 0,
		published: input.published ?? existing?.published ?? 1,
		created_at: existing?.created_at ?? ts,
		updated_at: ts,
	};

	await db
		.prepare(
			`INSERT INTO cases (id, title, role, result, image_url, sort_order, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         role = excluded.role,
         result = excluded.result,
         image_url = excluded.image_url,
         sort_order = excluded.sort_order,
         published = excluded.published,
         updated_at = excluded.updated_at`,
		)
		.bind(
			row.id,
			row.title,
			row.role,
			row.result,
			row.image_url,
			row.sort_order,
			row.published,
			row.created_at,
			row.updated_at,
		)
		.run();

	return row;
}

export async function deleteCase(db: D1Database, caseId: string) {
	await db.prepare(`DELETE FROM cases WHERE id = ?`).bind(caseId).run();
}

export async function upsertService(
	db: D1Database,
	input: Partial<ServiceItem> & { title: string },
): Promise<ServiceItem> {
	const ts = nowIso();
	const serviceId = input.id || id("svc");
	const existing = input.id
		? await db
				.prepare(`SELECT * FROM services WHERE id = ?`)
				.bind(input.id)
				.first<ServiceItem>()
		: null;

	const row: ServiceItem = {
		id: serviceId,
		title: input.title.trim(),
		description: (input.description ?? existing?.description ?? "").trim(),
		sort_order: input.sort_order ?? existing?.sort_order ?? 0,
		published: input.published ?? existing?.published ?? 1,
		created_at: existing?.created_at ?? ts,
		updated_at: ts,
	};

	await db
		.prepare(
			`INSERT INTO services (id, title, description, sort_order, published, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         sort_order = excluded.sort_order,
         published = excluded.published,
         updated_at = excluded.updated_at`,
		)
		.bind(
			row.id,
			row.title,
			row.description,
			row.sort_order,
			row.published,
			row.created_at,
			row.updated_at,
		)
		.run();

	return row;
}

export async function deleteService(db: D1Database, serviceId: string) {
	await db.prepare(`DELETE FROM services WHERE id = ?`).bind(serviceId).run();
}
