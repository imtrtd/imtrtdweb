import { requireAdmin } from "./lib/auth";
import {
	getAdminContent,
	getPublicContent,
	upsertCase,
	upsertCopy,
	upsertService,
	deleteCase,
	deleteService,
} from "./lib/cms";
import {
	badRequest,
	json,
	notFound,
	serverError,
	unauthorized,
	type LeadStatus,
} from "./lib/http";
import {
	checkRateLimit,
	createLead,
	listLeads,
	notifyStudio,
	updateLead,
	validateLead,
	type CreateLeadInput,
} from "./lib/leads";

function clientIp(request: Request): string {
	return (
		request.headers.get("CF-Connecting-IP") ||
		request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
		"unknown"
	);
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;

		try {
			if (pathname === "/api/content" && request.method === "GET") {
				const content = await getPublicContent(env.DB);
				return json(content, 200, {
					"Cache-Control": "public, max-age=30",
				});
			}

			if (pathname === "/api/leads" && request.method === "POST") {
				if (!checkRateLimit(clientIp(request))) {
					return json({ error: "Слишком много заявок. Попробуйте позже." }, 429);
				}

				const body = (await request.json()) as CreateLeadInput;
				const error = validateLead(body);
				if (error === "rejected") {
					return json({ ok: true });
				}
				if (error) {
					return badRequest(error);
				}

				const lead = await createLead(env.DB, body);
				void notifyStudio(env, lead);
				return json({ ok: true, id: lead.id }, 201);
			}

			if (pathname.startsWith("/api/admin/")) {
				if (!requireAdmin(request, env)) {
					return unauthorized();
				}

				if (pathname === "/api/admin/content" && request.method === "GET") {
					return json(await getAdminContent(env.DB));
				}

				if (pathname === "/api/admin/copy" && request.method === "PUT") {
					const body = (await request.json()) as Record<string, string>;
					await upsertCopy(env.DB, body);
					return json({ ok: true });
				}

				if (pathname === "/api/admin/cases" && request.method === "POST") {
					const body = (await request.json()) as {
						id?: string;
						title: string;
						role?: string;
						result?: string;
						image_url?: string;
						sort_order?: number;
						published?: number;
					};
					if (!body.title?.trim()) {
						return badRequest("title required");
					}
					return json(await upsertCase(env.DB, body));
				}

				if (
					pathname.startsWith("/api/admin/cases/") &&
					request.method === "DELETE"
				) {
					const caseId = pathname.split("/").pop();
					if (!caseId) {
						return badRequest("id required");
					}
					await deleteCase(env.DB, caseId);
					return json({ ok: true });
				}

				if (pathname === "/api/admin/services" && request.method === "POST") {
					const body = (await request.json()) as {
						id?: string;
						title: string;
						description?: string;
						sort_order?: number;
						published?: number;
					};
					if (!body.title?.trim()) {
						return badRequest("title required");
					}
					return json(await upsertService(env.DB, body));
				}

				if (
					pathname.startsWith("/api/admin/services/") &&
					request.method === "DELETE"
				) {
					const serviceId = pathname.split("/").pop();
					if (!serviceId) {
						return badRequest("id required");
					}
					await deleteService(env.DB, serviceId);
					return json({ ok: true });
				}

				if (pathname === "/api/admin/leads" && request.method === "GET") {
					const status = url.searchParams.get("status") ?? undefined;
					return json({ leads: await listLeads(env.DB, status) });
				}

				if (
					pathname.startsWith("/api/admin/leads/") &&
					request.method === "PATCH"
				) {
					const leadId = pathname.split("/").pop();
					if (!leadId) {
						return badRequest("id required");
					}
					const body = (await request.json()) as {
						status?: LeadStatus;
						note?: string;
					};
					const updated = await updateLead(env.DB, leadId, body);
					if (!updated) {
						return notFound("Lead not found");
					}
					return json(updated);
				}

				return notFound();
			}

			return notFound();
		} catch (error) {
			console.error(error);
			return serverError();
		}
	},
} satisfies ExportedHandler<Env>;
