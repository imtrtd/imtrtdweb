import { canDelete, getAdminSession } from "./lib/auth";
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
	forbidden,
	json,
	notFound,
	serverError,
	unauthorized,
	type LeadStatus,
} from "./lib/http";
import {
	checkRateLimit,
	createLead,
	getLeadStats,
	listLeads,
	notifyClient,
	notifyStudio,
	remindStaleLeads,
	updateLead,
	validateLead,
	type CreateLeadInput,
} from "./lib/leads";
import { getMedia, uploadMedia } from "./lib/media";

function clientIp(request: Request): string {
	return (
		request.headers.get("CF-Connecting-IP") ||
		request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
		"unknown"
	);
}

const worker = {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;

		try {
			if (pathname.startsWith("/api/media/") && request.method === "GET") {
				const key = decodeURIComponent(pathname.slice("/api/media/".length));
				if (!key || key.includes("..")) {
					return badRequest("invalid key");
				}
				const response = await getMedia(env.MEDIA, key);
				return response ?? notFound("Media not found");
			}

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
				void notifyClient(env, lead);
				return json({ ok: true, id: lead.id }, 201);
			}

			if (pathname.startsWith("/api/admin/")) {
				const session = getAdminSession(request, env);
				if (!session) {
					return unauthorized();
				}

				if (pathname === "/api/admin/me" && request.method === "GET") {
					return json({ role: session.role });
				}

				if (pathname === "/api/admin/stats" && request.method === "GET") {
					return json(await getLeadStats(env.DB));
				}

				if (pathname === "/api/admin/content" && request.method === "GET") {
					return json(await getAdminContent(env.DB));
				}

				if (pathname === "/api/admin/copy" && request.method === "PUT") {
					const body = (await request.json()) as Record<string, string>;
					await upsertCopy(env.DB, body);
					return json({ ok: true });
				}

				if (pathname === "/api/admin/media" && request.method === "POST") {
					const form = await request.formData();
					const file = form.get("file");
					if (!(file instanceof File)) {
						return badRequest("file required");
					}
					try {
						const uploaded = await uploadMedia(env.MEDIA, file);
						return json(uploaded, 201);
					} catch (err) {
						return badRequest(
							err instanceof Error ? err.message : "Upload failed",
						);
					}
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
					if (!canDelete(session)) {
						return forbidden("Только owner может удалять");
					}
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
					if (!canDelete(session)) {
						return forbidden("Только owner может удалять");
					}
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
						next_step?: string;
						brief_url?: string;
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

	async scheduled(
		_controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext,
	): Promise<void> {
		ctx.waitUntil(
			remindStaleLeads(env).then((count) => {
				console.log(`Stale lead reminders sent: ${count}`);
			}),
		);
	},
};

export default worker satisfies ExportedHandler<Env>;
