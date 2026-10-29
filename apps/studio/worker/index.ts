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
import { notifyLeadEmail } from "./lib/email";
import { sendTelegram } from "./lib/telegram";
import { AppStore, doDatabase } from "./lib/store-do";
import { turnstilePublicConfig, verifyTurnstile } from "./lib/turnstile";

export { AppStore };

function db(env: Env): D1Database {
	if (env.DB) {
		return env.DB;
	}
	return doDatabase(env);
}

function clientIp(request: Request): string {
	return (
		request.headers.get("CF-Connecting-IP") ||
		request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
		"unknown"
	);
}

const PUBLIC_ORIGINS = new Set([
	"https://imtrtd.space",
	"https://www.imtrtd.space",
	// lite site: its brief form posts to /api/leads
	"https://imtryingtodesign.com",
	"https://www.imtryingtodesign.com",
]);

function corsHeaders(request: Request): Record<string, string> {
	const origin = request.headers.get("Origin");
	if (!origin || !PUBLIC_ORIGINS.has(origin)) {
		return {};
	}
	return {
		"Access-Control-Allow-Origin": origin,
		"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
		"Access-Control-Allow-Headers": "Content-Type",
		"Access-Control-Max-Age": "86400",
		Vary: "Origin",
	};
}

function withCors(response: Response, cors: Record<string, string>): Response {
	if (!Object.keys(cors).length) {
		return response;
	}
	const out = new Response(response.body, response);
	for (const [k, v] of Object.entries(cors)) {
		out.headers.set(k, v);
	}
	return out;
}

function cleanSource(raw: unknown): string {
	return typeof raw === "string" ? raw.trim().slice(0, 200) : "";
}

const worker = {
	async fetch(
		request: Request,
		env: Env,
		ctx?: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;
		if (pathname === "/api/content" || pathname === "/api/leads") {
			const cors = corsHeaders(request);
			if (request.method === "OPTIONS") {
				return new Response(null, {
					status: Object.keys(cors).length ? 204 : 403,
					headers: cors,
				});
			}
			return withCors(await worker.handle(request, env, ctx), cors);
		}
		return worker.handle(request, env, ctx);
	},

	async handle(
		request: Request,
		env: Env,
		ctx?: ExecutionContext,
	): Promise<Response> {
		const url = new URL(request.url);
		const { pathname } = url;
		const database = db(env);

		try {
			if (pathname.startsWith("/api/media/") && request.method === "GET") {
				if (!env.MEDIA) {
					return notFound("Media storage not configured");
				}
				const key = decodeURIComponent(pathname.slice("/api/media/".length));
				if (!key || key.includes("..")) {
					return badRequest("invalid key");
				}
				const response = await getMedia(env.MEDIA, key);
				return response ?? notFound("Media not found");
			}

			if (pathname === "/api/content" && request.method === "GET") {
				const content = await getPublicContent(database);
				return json(content, 200, {
					"Cache-Control": "public, max-age=30",
				});
			}

			if (pathname === "/api/leads" && request.method === "GET") {
				// Form config for the public sites; turnstile is null while the check is off.
				return json(
					{ turnstile: turnstilePublicConfig(env) },
					200,
					{ "Cache-Control": "public, max-age=300" },
				);
			}

			if (pathname === "/api/leads" && request.method === "POST") {
				if (!checkRateLimit(clientIp(request))) {
					return json({ error: "Слишком много заявок. Попробуйте позже." }, 429);
				}

				let body: CreateLeadInput;
				try {
					body = (await request.json()) as CreateLeadInput;
				} catch {
					return badRequest("invalid json");
				}
				const error = validateLead(body);
				if (error === "rejected") {
					return json({ ok: true });
				}
				if (error) {
					return badRequest(error);
				}

				const captcha = await verifyTurnstile(
					env,
					body.turnstile_token,
					request.headers.get("Origin"),
					clientIp(request),
				);
				if (captcha === "missing" || captcha === "invalid") {
					return json(
						{ error: "Anti-spam check failed. Reload the page and try again." },
						403,
					);
				}

				const source = cleanSource(body.source);
				const lead = await createLead(database, {
					...body,
					message: source
						? `${(body.message ?? "").trim()}\n\n— ${source}`.trim()
						: body.message,
				});
				// Telegram and email go out in parallel from this one submission; each is fail-soft.
				const [tg, mail] = await Promise.all([
					sendTelegram(env, lead, source),
					notifyLeadEmail(env, lead, source),
				]);
				const extras = Promise.allSettled([notifyStudio(env, lead), notifyClient(env, lead)]);
				if (ctx) {
					ctx.waitUntil(extras);
				} else {
					await extras;
				}
				return json(
					{
						ok: true,
						id: lead.id,
						notified: { telegram: tg.sent > 0, telegram_bot: tg.bot, email: mail.ok },
					},
					201,
				);
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
					return json(await getLeadStats(database));
				}

				if (pathname === "/api/admin/content" && request.method === "GET") {
					return json(await getAdminContent(database));
				}

				if (pathname === "/api/admin/copy" && request.method === "PUT") {
					const body = (await request.json()) as Record<string, string>;
					await upsertCopy(database, body);
					return json({ ok: true });
				}

				if (pathname === "/api/admin/media" && request.method === "POST") {
					if (!env.MEDIA) {
						return badRequest(
							"R2 не включён. Включите R2 в Dashboard и добавьте binding MEDIA.",
						);
					}
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
					return json(await upsertCase(database, body));
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
					await deleteCase(database, caseId);
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
					return json(await upsertService(database, body));
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
					await deleteService(database, serviceId);
					return json({ ok: true });
				}

				if (pathname === "/api/admin/leads" && request.method === "GET") {
					const status = url.searchParams.get("status") ?? undefined;
					return json({ leads: await listLeads(database, status) });
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
					const updated = await updateLead(database, leadId, body);
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
		const bound = { ...env, DB: db(env) } as Env;
		ctx.waitUntil(
			remindStaleLeads(bound).then((count) => {
				console.log(`Stale lead reminders sent: ${count}`);
			}),
		);
	},
};

export default worker satisfies ExportedHandler<Env>;
