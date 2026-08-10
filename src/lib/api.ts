import type {
	AdminRole,
	Lead,
	LeadPayload,
	LeadStats,
	LeadStatus,
	SiteContent,
} from "../types";

const TOKEN_KEY = "imtrtd_admin_token";

export function getAdminToken() {
	return localStorage.getItem(TOKEN_KEY) ?? "";
}

export function setAdminToken(token: string) {
	localStorage.setItem(TOKEN_KEY, token);
}

export function clearAdminToken() {
	localStorage.removeItem(TOKEN_KEY);
}

function adminHeaders(json = true): HeadersInit {
	const token = getAdminToken();
	const headers: Record<string, string> = {};
	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}
	if (json) {
		headers["Content-Type"] = "application/json";
	}
	return headers;
}

async function assertAdmin(res: Response) {
	if (res.status === 401) {
		throw new Error("unauthorized");
	}
	if (res.status === 403) {
		const data = await res.json().catch(() => ({}));
		throw new Error(data.error || "Forbidden");
	}
}

export async function fetchContent(): Promise<SiteContent> {
	const res = await fetch("/api/content");
	if (!res.ok) {
		throw new Error("Failed to load content");
	}
	return res.json();
}

export async function submitLead(payload: LeadPayload) {
	const res = await fetch("/api/leads", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(payload),
	});
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data.error || "Не удалось отправить заявку");
	}
	return data;
}

export async function adminFetchMe(): Promise<{ role: AdminRole }> {
	const res = await fetch("/api/admin/me", { headers: adminHeaders() });
	await assertAdmin(res);
	if (!res.ok) {
		throw new Error("Failed to load session");
	}
	return res.json();
}

export async function adminFetchStats(): Promise<LeadStats> {
	const res = await fetch("/api/admin/stats", { headers: adminHeaders() });
	await assertAdmin(res);
	if (!res.ok) {
		throw new Error("Failed to load stats");
	}
	return res.json();
}

export async function adminFetchContent(): Promise<SiteContent> {
	const res = await fetch("/api/admin/content", { headers: adminHeaders() });
	await assertAdmin(res);
	if (!res.ok) {
		throw new Error("Failed to load admin content");
	}
	return res.json();
}

export async function adminFetchLeads(status?: string): Promise<Lead[]> {
	const q = status ? `?status=${encodeURIComponent(status)}` : "";
	const res = await fetch(`/api/admin/leads${q}`, { headers: adminHeaders() });
	await assertAdmin(res);
	if (!res.ok) {
		throw new Error("Failed to load leads");
	}
	const data = await res.json();
	return data.leads ?? [];
}

export async function adminUpdateLead(
	id: string,
	patch: {
		status?: LeadStatus;
		note?: string;
		next_step?: string;
		brief_url?: string;
	},
) {
	const res = await fetch(`/api/admin/leads/${id}`, {
		method: "PATCH",
		headers: adminHeaders(),
		body: JSON.stringify(patch),
	});
	await assertAdmin(res);
	if (!res.ok) {
		throw new Error("Failed to update lead");
	}
	return res.json();
}

export async function adminSaveCopy(copy: Record<string, string>) {
	const res = await fetch("/api/admin/copy", {
		method: "PUT",
		headers: adminHeaders(),
		body: JSON.stringify(copy),
	});
	await assertAdmin(res);
	if (!res.ok) {
		throw new Error("Failed to save copy");
	}
}

export async function adminSaveCase(body: Record<string, unknown>) {
	const res = await fetch("/api/admin/cases", {
		method: "POST",
		headers: adminHeaders(),
		body: JSON.stringify(body),
	});
	await assertAdmin(res);
	if (!res.ok) {
		throw new Error("Failed to save case");
	}
	return res.json();
}

export async function adminDeleteCase(id: string) {
	const res = await fetch(`/api/admin/cases/${id}`, {
		method: "DELETE",
		headers: adminHeaders(),
	});
	await assertAdmin(res);
	if (!res.ok) {
		throw new Error("Failed to delete case");
	}
}

export async function adminSaveService(body: Record<string, unknown>) {
	const res = await fetch("/api/admin/services", {
		method: "POST",
		headers: adminHeaders(),
		body: JSON.stringify(body),
	});
	await assertAdmin(res);
	if (!res.ok) {
		throw new Error("Failed to save service");
	}
	return res.json();
}

export async function adminDeleteService(id: string) {
	const res = await fetch(`/api/admin/services/${id}`, {
		method: "DELETE",
		headers: adminHeaders(),
	});
	await assertAdmin(res);
	if (!res.ok) {
		throw new Error("Failed to delete service");
	}
}

export async function adminUploadMedia(file: File): Promise<{ url: string }> {
	const form = new FormData();
	form.append("file", file);
	const res = await fetch("/api/admin/media", {
		method: "POST",
		headers: adminHeaders(false),
		body: form,
	});
	await assertAdmin(res);
	const data = await res.json().catch(() => ({}));
	if (!res.ok) {
		throw new Error(data.error || "Upload failed");
	}
	return data;
}
