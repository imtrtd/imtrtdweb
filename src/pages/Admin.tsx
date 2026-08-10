import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { CaseItem, Lead, LeadStatus, ServiceItem, SiteContent } from "../types";
import {
	adminDeleteCase,
	adminDeleteService,
	adminFetchContent,
	adminFetchLeads,
	adminSaveCase,
	adminSaveCopy,
	adminSaveService,
	adminUpdateLead,
	clearAdminToken,
	getAdminToken,
	setAdminToken,
} from "../lib/api";

type Tab = "leads" | "copy" | "cases" | "services";

const STATUSES: LeadStatus[] = ["new", "in_progress", "done", "archived"];

export function AdminPage() {
	const [tokenInput, setTokenInput] = useState(getAdminToken());
	const [authed, setAuthed] = useState(Boolean(getAdminToken()));
	const [tab, setTab] = useState<Tab>("leads");
	const [error, setError] = useState("");
	const [leads, setLeads] = useState<Lead[]>([]);
	const [content, setContent] = useState<SiteContent | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [busy, setBusy] = useState(false);

	async function load() {
		try {
			const [leadRows, adminContent] = await Promise.all([
				adminFetchLeads(statusFilter || undefined),
				adminFetchContent(),
			]);
			setLeads(leadRows);
			setContent(adminContent);
			setAuthed(true);
			setError("");
		} catch (err) {
			if (err instanceof Error && err.message === "unauthorized") {
				setAuthed(false);
				clearAdminToken();
				setError("Неверный токен");
				return;
			}
			setError(err instanceof Error ? err.message : "Ошибка загрузки");
		}
	}

	useEffect(() => {
		if (!authed) {
			return;
		}
		let cancelled = false;
		void (async () => {
			try {
				const [leadRows, adminContent] = await Promise.all([
					adminFetchLeads(statusFilter || undefined),
					adminFetchContent(),
				]);
				if (cancelled) {
					return;
				}
				setLeads(leadRows);
				setContent(adminContent);
				setError("");
			} catch (err) {
				if (cancelled) {
					return;
				}
				if (err instanceof Error && err.message === "unauthorized") {
					setAuthed(false);
					clearAdminToken();
					setError("Неверный токен");
					return;
				}
				setError(err instanceof Error ? err.message : "Ошибка загрузки");
			}
		})();
		return () => {
			cancelled = true;
		};
	}, [authed, statusFilter]);

	function onLogin(event: FormEvent) {
		event.preventDefault();
		setAdminToken(tokenInput.trim());
		setAuthed(true);
	}

	if (!authed) {
		return (
			<div className="flex min-h-screen items-center justify-center bg-ink px-6 text-paper">
				<form
					onSubmit={onLogin}
					className="w-full max-w-md space-y-4 rounded-2xl border border-white/10 bg-ink-soft p-8"
				>
					<h1 className="font-display text-2xl font-bold">Кабинет студии</h1>
					<p className="text-sm text-mist">
						Введите ADMIN_TOKEN (секрет Worker). Позже можно закрыть /admin через
						Cloudflare Access.
					</p>
					<input
						type="password"
						value={tokenInput}
						onChange={(e) => setTokenInput(e.target.value)}
						className="w-full rounded-xl border border-white/10 bg-ink px-4 py-3 outline-none focus:border-signal/50"
						placeholder="Admin token"
						required
					/>
					{error ? <p className="text-sm text-red-300">{error}</p> : null}
					<button
						type="submit"
						className="rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink"
					>
						Войти
					</button>
				</form>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-ink text-paper">
			<header className="border-b border-white/10 px-6 py-4">
				<div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
					<div>
						<p className="font-display text-lg font-bold">IMTRTD Admin</p>
						<p className="text-xs text-mist">Inbox + CMS</p>
					</div>
					<div className="flex flex-wrap gap-2">
						{(
							[
								["leads", "Заявки"],
								["copy", "Тексты"],
								["cases", "Кейсы"],
								["services", "Услуги"],
							] as const
						).map(([id, label]) => (
							<button
								key={id}
								type="button"
								onClick={() => setTab(id)}
								className={`rounded-full px-4 py-2 text-sm ${
									tab === id
										? "bg-signal font-semibold text-ink"
										: "border border-white/15 text-fog"
								}`}
							>
								{label}
							</button>
						))}
						<a href="/" className="rounded-full border border-white/15 px-4 py-2 text-sm text-fog">
							На сайт
						</a>
						<button
							type="button"
							className="rounded-full border border-white/15 px-4 py-2 text-sm text-fog"
							onClick={() => {
								clearAdminToken();
								setAuthed(false);
							}}
						>
							Выйти
						</button>
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-6xl px-6 py-8">
				{error ? <p className="mb-4 text-sm text-red-300">{error}</p> : null}

				{tab === "leads" ? (
					<LeadsPanel
						leads={leads}
						statusFilter={statusFilter}
						setStatusFilter={setStatusFilter}
						onRefresh={load}
						busy={busy}
						setBusy={setBusy}
						setError={setError}
					/>
				) : null}

				{tab === "copy" && content ? (
					<CopyPanel
						copy={content.copy}
						onSaved={load}
						setError={setError}
						busy={busy}
						setBusy={setBusy}
					/>
				) : null}

				{tab === "cases" && content ? (
					<CasesPanel
						cases={content.cases}
						onSaved={load}
						setError={setError}
						busy={busy}
						setBusy={setBusy}
					/>
				) : null}

				{tab === "services" && content ? (
					<ServicesPanel
						services={content.services}
						onSaved={load}
						setError={setError}
						busy={busy}
						setBusy={setBusy}
					/>
				) : null}
			</main>
		</div>
	);
}

function LeadsPanel({
	leads,
	statusFilter,
	setStatusFilter,
	onRefresh,
	busy,
	setBusy,
	setError,
}: {
	leads: Lead[];
	statusFilter: string;
	setStatusFilter: (v: string) => void;
	onRefresh: () => Promise<void>;
	busy: boolean;
	setBusy: (v: boolean) => void;
	setError: (v: string) => void;
}) {
	async function patch(id: string, data: { status?: LeadStatus; note?: string }) {
		setBusy(true);
		setError("");
		try {
			await adminUpdateLead(id, data);
			await onRefresh();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка обновления");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-center gap-3">
				<label className="text-sm text-mist">
					Статус{" "}
					<select
						value={statusFilter}
						onChange={(e) => setStatusFilter(e.target.value)}
						className="ml-2 rounded-lg border border-white/10 bg-ink-soft px-3 py-2"
					>
						<option value="">Все</option>
						{STATUSES.map((s) => (
							<option key={s} value={s}>
								{s}
							</option>
						))}
					</select>
				</label>
				<button
					type="button"
					onClick={() => void onRefresh()}
					className="rounded-full border border-white/15 px-4 py-2 text-sm"
				>
					Обновить
				</button>
			</div>

			{leads.length === 0 ? (
				<p className="text-mist">Заявок пока нет.</p>
			) : (
				<ul className="space-y-4">
					{leads.map((lead) => (
						<li
							key={lead.id}
							className="rounded-2xl border border-white/10 bg-ink-soft p-5"
						>
							<div className="flex flex-wrap items-start justify-between gap-3">
								<div>
									<p className="font-display text-lg font-semibold">{lead.name}</p>
									<p className="text-sm text-fog">{lead.contact}</p>
									<p className="mt-1 text-xs text-mist">
										{new Date(lead.created_at).toLocaleString("ru-RU")} · {lead.id}
									</p>
								</div>
								<select
									disabled={busy}
									value={lead.status}
									onChange={(e) =>
										void patch(lead.id, {
											status: e.target.value as LeadStatus,
										})
									}
									className="rounded-lg border border-white/10 bg-ink px-3 py-2 text-sm"
								>
									{STATUSES.map((s) => (
										<option key={s} value={s}>
											{s}
										</option>
									))}
								</select>
							</div>
							<p className="mt-3 text-sm text-fog">
								{lead.task_type || "Тип не указан"}
								{lead.budget ? ` · ${lead.budget}` : ""}
							</p>
							{lead.message ? (
								<p className="mt-2 whitespace-pre-wrap text-paper">{lead.message}</p>
							) : null}
							<label className="mt-4 block space-y-2">
								<span className="text-xs text-mist">Заметка</span>
								<textarea
									defaultValue={lead.note}
									rows={2}
									className="w-full rounded-xl border border-white/10 bg-ink px-3 py-2 text-sm"
									onBlur={(e) => {
										if (e.target.value !== lead.note) {
											void patch(lead.id, { note: e.target.value });
										}
									}}
								/>
							</label>
							{lead.first_response_at ? (
								<p className="mt-2 text-xs text-signal">
									Первый ответ:{" "}
									{new Date(lead.first_response_at).toLocaleString("ru-RU")}
								</p>
							) : null}
						</li>
					))}
				</ul>
			)}
		</div>
	);
}

function CopyPanel({
	copy,
	onSaved,
	setError,
	busy,
	setBusy,
}: {
	copy: Record<string, string>;
	onSaved: () => Promise<void>;
	setError: (v: string) => void;
	busy: boolean;
	setBusy: (v: boolean) => void;
}) {
	const [draft, setDraft] = useState(copy);

	useEffect(() => {
		setDraft(copy);
	}, [copy]);

	async function save(event: FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			await adminSaveCopy(draft);
			await onSaved();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка сохранения");
		} finally {
			setBusy(false);
		}
	}

	const fields = [
		["brand", "Бренд"],
		["headline", "Заголовок"],
		["subhead", "Подзаголовок"],
		["cta_label", "CTA"],
		["contact_email", "Email"],
		["contact_telegram", "Telegram"],
	] as const;

	return (
		<form onSubmit={save} className="max-w-2xl space-y-4">
			{fields.map(([key, label]) => (
				<label key={key} className="block space-y-2">
					<span className="text-sm text-mist">{label}</span>
					{key === "subhead" || key === "headline" ? (
						<textarea
							rows={key === "subhead" ? 3 : 2}
							value={draft[key] ?? ""}
							onChange={(e) =>
								setDraft((prev) => ({ ...prev, [key]: e.target.value }))
							}
							className="w-full rounded-xl border border-white/10 bg-ink-soft px-4 py-3"
						/>
					) : (
						<input
							value={draft[key] ?? ""}
							onChange={(e) =>
								setDraft((prev) => ({ ...prev, [key]: e.target.value }))
							}
							className="w-full rounded-xl border border-white/10 bg-ink-soft px-4 py-3"
						/>
					)}
				</label>
			))}
			<button
				type="submit"
				disabled={busy}
				className="rounded-full bg-signal px-5 py-2.5 text-sm font-semibold text-ink disabled:opacity-60"
			>
				Сохранить тексты
			</button>
		</form>
	);
}

function CasesPanel({
	cases,
	onSaved,
	setError,
	busy,
	setBusy,
}: {
	cases: CaseItem[];
	onSaved: () => Promise<void>;
	setError: (v: string) => void;
	busy: boolean;
	setBusy: (v: boolean) => void;
}) {
	const blank = {
		title: "",
		role: "",
		result: "",
		image_url: "",
		sort_order: cases.length + 1,
		published: 1,
	};
	const [draft, setDraft] = useState(blank);

	async function save(event: FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			await adminSaveCase(draft);
			setDraft({ ...blank, sort_order: cases.length + 2 });
			await onSaved();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка сохранения");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="space-y-8">
			<form onSubmit={save} className="grid gap-3 rounded-2xl border border-white/10 p-5 md:grid-cols-2">
				<input
					required
					placeholder="Название"
					value={draft.title}
					onChange={(e) => setDraft({ ...draft, title: e.target.value })}
					className="rounded-xl border border-white/10 bg-ink-soft px-3 py-2"
				/>
				<input
					placeholder="Роль"
					value={draft.role}
					onChange={(e) => setDraft({ ...draft, role: e.target.value })}
					className="rounded-xl border border-white/10 bg-ink-soft px-3 py-2"
				/>
				<input
					placeholder="Результат"
					value={draft.result}
					onChange={(e) => setDraft({ ...draft, result: e.target.value })}
					className="md:col-span-2 rounded-xl border border-white/10 bg-ink-soft px-3 py-2"
				/>
				<input
					placeholder="Image URL"
					value={draft.image_url}
					onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
					className="md:col-span-2 rounded-xl border border-white/10 bg-ink-soft px-3 py-2"
				/>
				<button
					type="submit"
					disabled={busy}
					className="rounded-full bg-signal px-5 py-2 text-sm font-semibold text-ink disabled:opacity-60 md:col-span-2 md:w-fit"
				>
					Добавить кейс
				</button>
			</form>

			<ul className="space-y-3">
				{cases.map((item) => (
					<li
						key={item.id}
						className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3"
					>
						<div>
							<p className="font-semibold">
								{item.title}{" "}
								<span className="text-xs text-mist">
									{item.published ? "published" : "draft"}
								</span>
							</p>
							<p className="text-sm text-mist">
								{item.role} · {item.result}
							</p>
						</div>
						<div className="flex gap-2">
							<button
								type="button"
								className="rounded-full border border-white/15 px-3 py-1.5 text-xs"
								disabled={busy}
								onClick={() =>
									void (async () => {
										setBusy(true);
										try {
											await adminSaveCase({
												...item,
												published: item.published ? 0 : 1,
											});
											await onSaved();
										} catch (err) {
											setError(
												err instanceof Error ? err.message : "Ошибка",
											);
										} finally {
											setBusy(false);
										}
									})()
								}
							>
								{item.published ? "Скрыть" : "Опубликовать"}
							</button>
							<button
								type="button"
								className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-200"
								disabled={busy}
								onClick={() =>
									void (async () => {
										setBusy(true);
										try {
											await adminDeleteCase(item.id);
											await onSaved();
										} catch (err) {
											setError(
												err instanceof Error ? err.message : "Ошибка",
											);
										} finally {
											setBusy(false);
										}
									})()
								}
							>
								Удалить
							</button>
						</div>
					</li>
				))}
			</ul>
		</div>
	);
}

function ServicesPanel({
	services,
	onSaved,
	setError,
	busy,
	setBusy,
}: {
	services: ServiceItem[];
	onSaved: () => Promise<void>;
	setError: (v: string) => void;
	busy: boolean;
	setBusy: (v: boolean) => void;
}) {
	const blank = {
		title: "",
		description: "",
		sort_order: services.length + 1,
		published: 1,
	};
	const [draft, setDraft] = useState(blank);

	async function save(event: FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError("");
		try {
			await adminSaveService(draft);
			setDraft({ ...blank, sort_order: services.length + 2 });
			await onSaved();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Ошибка сохранения");
		} finally {
			setBusy(false);
		}
	}

	return (
		<div className="space-y-8">
			<form onSubmit={save} className="grid gap-3 rounded-2xl border border-white/10 p-5">
				<input
					required
					placeholder="Название услуги"
					value={draft.title}
					onChange={(e) => setDraft({ ...draft, title: e.target.value })}
					className="rounded-xl border border-white/10 bg-ink-soft px-3 py-2"
				/>
				<textarea
					placeholder="Описание"
					rows={3}
					value={draft.description}
					onChange={(e) => setDraft({ ...draft, description: e.target.value })}
					className="rounded-xl border border-white/10 bg-ink-soft px-3 py-2"
				/>
				<button
					type="submit"
					disabled={busy}
					className="w-fit rounded-full bg-signal px-5 py-2 text-sm font-semibold text-ink disabled:opacity-60"
				>
					Добавить услугу
				</button>
			</form>

			<ul className="space-y-3">
				{services.map((item) => (
					<li
						key={item.id}
						className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3"
					>
						<div>
							<p className="font-semibold">{item.title}</p>
							<p className="text-sm text-mist">{item.description}</p>
						</div>
						<button
							type="button"
							className="rounded-full border border-red-400/30 px-3 py-1.5 text-xs text-red-200"
							disabled={busy}
							onClick={() =>
								void (async () => {
									setBusy(true);
									try {
										await adminDeleteService(item.id);
										await onSaved();
									} catch (err) {
										setError(err instanceof Error ? err.message : "Ошибка");
									} finally {
										setBusy(false);
									}
								})()
							}
						>
							Удалить
						</button>
					</li>
				))}
			</ul>
		</div>
	);
}
