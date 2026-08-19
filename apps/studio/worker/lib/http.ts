export type LeadStatus = "new" | "in_progress" | "done" | "archived";

export type Lead = {
	id: string;
	name: string;
	contact: string;
	task_type: string;
	budget: string;
	message: string;
	status: LeadStatus;
	note: string;
	next_step: string;
	brief_url: string;
	first_response_at: string | null;
	reminded_at: string | null;
	created_at: string;
	updated_at: string;
};

export function forbidden(message = "Forbidden") {
	return json({ error: message }, 403);
}

export type CaseItem = {
	id: string;
	title: string;
	role: string;
	result: string;
	image_url: string;
	sort_order: number;
	published: number;
	created_at: string;
	updated_at: string;
};

export type ServiceItem = {
	id: string;
	title: string;
	description: string;
	sort_order: number;
	published: number;
	created_at: string;
	updated_at: string;
};

export type SiteContent = {
	copy: Record<string, string>;
	cases: CaseItem[];
	services: ServiceItem[];
};

export function json(data: unknown, status = 200, headers: HeadersInit = {}) {
	return Response.json(data, {
		status,
		headers: {
			"Cache-Control": "no-store",
			...headers,
		},
	});
}

export function badRequest(message: string) {
	return json({ error: message }, 400);
}

export function unauthorized() {
	return json({ error: "Unauthorized" }, 401);
}

export function notFound(message = "Not Found") {
	return json({ error: message }, 404);
}

export function serverError(message = "Internal Server Error") {
	return json({ error: message }, 500);
}

export function nowIso() {
	return new Date().toISOString();
}

export function id(prefix: string) {
	return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}
