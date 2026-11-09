import { useEffect, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import type {
	AdminRole,
	CaseItem,
	Lead,
	LeadStats,
	LeadStatus,
	ServiceItem,
	SiteContent,
} from "../types";
import {
	adminDeleteCase,
	adminDeleteService,
	adminFetchContent,
	adminFetchLeads,
	adminFetchMe,
	adminFetchStats,
	adminSaveCase,
	adminSaveCopy,
	adminSaveService,
	adminUpdateLead,
	adminUploadMedia,
	clearAdminToken,
	getAdminToken,
	setAdminToken,
} from "../lib/api";

/*
 * The admin wears the imtrtd design system (styles/admin.css, scoped to .adm):
 * same tokens, type, square shapes and accent switch as imtrtd.space.
 */

type Tab = "dashboard" | "leads" | "copy" | "cases" | "services";

const TABS: { id: Tab; label: string }[] = [
	{ id: "dashboard", label: "Сводка" },
	{ id: "leads", label: "Заявки" },
	{ id: "copy", label: "Тексты" },
	{ id: "cases", label: "Кейсы" },
	{ id: "services", label: "Услуги" },
];

const STATUSES: LeadStatus[] = ["new", "in_progress", "done", "archived"];
const STATUS_LABEL: Record<LeadStatus, string> = {
	new: "Новая",
	in_progress: "В работе",
	done: "Готово",
	archived: "Архив",
};

const ACCENTS = [
	{ id: "violet", label: "Violet", color: "#b28dff" },
	{ id: "lime", label: "Lime", color: "#d8ff00" },
	{ id: "magenta", label: "Magenta", color: "#ff2bd6" },
	{ id: "cyan", label: "Cyan", color: "#2ee9ff" },
] as const;
type Accent = (typeof ACCENTS)[number]["id"];
const ACCENT_KEY = "imtrtd-admin-accent";

const SITE_URL = "https://imtrtd.space";

const EMPTY_STATS: LeadStats = {
	total: 0,
	week: 0,
	new_count: 0,
	in_progress: 0,
	stale_over_24h: 0,
};

function readAccent(): Accent {
	try {
		const v = localStorage.getItem(ACCENT_KEY);
		if (ACCENTS.some((a) => a.id === v)) return v as Accent;
	} catch {
		/* storage blocked: default accent */
	}
	return "violet";
}

function errText(err: unknown, fallback: string) {
	return err instanceof Error ? err.message : fallback;
}

export function AdminPage() {
	const [tokenInput, setTokenInput] = useState(getAdminToken());
	const [authed, setAuthed] = useState(Boolean(getAdminToken()));
	const [role, setRole] = useState<AdminRole>("owner");
	const [tab, setTab] = useState<Tab>("dashboard");
	const [error, setError] = useState("");
	const [leads, setLeads] = useState<Lead[]>([]);
	const [stats, setStats] = useState<LeadStats>(EMPTY_STATS);
	const [content, setContent] = useState<SiteContent | null>(null);
	const [statusFilter, setStatusFilter] = useState<string>("");
	const [busy, setBusy] = useState(false);
	const [accent, setAccent] = useState<Accent>(readAccent);

	useEffect(() => {
		document.title = "Admin — IMTRTD";
	}, []);

	function pickAccent(a: Accent) {
		setAccent(a);
		try {
			localStorage.setItem(ACCENT_KEY, a);
		} catch {
			/* not persisted */
		}
	}

	async function load() {
		try {
			const [me, leadRows, adminContent, leadStats] = await Promise.all([
				adminFetchMe(),
				adminFetchLeads(statusFilter || undefined),
				adminFetchContent(),
				adminFetchStats(),
			]);
			setRole(me.role);
			setLeads(leadRows);
			setContent(adminContent);
			setStats(leadStats);
			setAuthed(true);
			setError("");
		} catch (err) {
			if (err instanceof Error && err.message === "unauthorized") {
				setAuthed(false);
				clearAdminToken();
				setError("Неверный токен");
				return;
			}
			setError(errText(err, "Ошибка загрузки"));
		}
	}

	useEffect(() => {
		if (!authed) {
			return;
		}
		let cancelled = false;
		void (async () => {
			try {
				const [me, leadRows, adminContent, leadStats] = await Promise.all([
					adminFetchMe(),
					adminFetchLeads(statusFilter || undefined),
					adminFetchContent(),
					adminFetchStats(),
				]);
				if (cancelled) {
					return;
				}
				setRole(me.role);
				setLeads(leadRows);
				setContent(adminContent);
				setStats(leadStats);
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
				setError(errText(err, "Ошибка загрузки"));
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

	const accentAttr = accent === "violet" ? undefined : accent;

	if (!authed) {
		return (
			<div className="adm" data-accent={accentAttr}>
				<div className="adm-login">
					<form onSubmit={onLogin} className="card">
						<img src="/brand/logo-mark.svg" alt="I/TD" width={48} height={48} />
						<div>
							<p className="label sec-index">Кабинет студии</p>
							<h1 className="display-md" style={{ marginTop: "0.9rem" }}>
								Вход
							</h1>
							<p className="t-fog" style={{ marginTop: "0.75rem" }}>
								Токен владельца (ADMIN_TOKEN) или редактора (EDITOR_TOKEN).
							</p>
						</div>
						<label className="fld">
							<span className="label">Токен</span>
							<input
								type="password"
								value={tokenInput}
								onChange={(e) => setTokenInput(e.target.value)}
								className="field"
								placeholder="Admin / editor token"
								autoComplete="current-password"
								required
							/>
						</label>
						{error ? <ErrorBox text={error} /> : null}
						<button type="submit" className="btn btn-primary">
							Войти <span className="arrow" aria-hidden="true">→</span>
						</button>
					</form>
				</div>
			</div>
		);
	}

	const isOwner = role === "owner";

	return (
		<div className="adm" data-accent={accentAttr}>
			<header className="adm-head">
				<div className="wrap row">
					<a href="/admin" className="adm-brand" aria-label="IMTRTD Admin">
						<img src="/brand/logo-mark.svg" alt="I/TD" width={40} height={40} />
						<span className="label t-mute">
							Admin · {isOwner ? "владелец" : "редактор"}
						</span>
					</a>

					<nav className="adm-tabs" aria-label="Разделы">
						{TABS.map((t) => (
							<button
								key={t.id}
								type="button"
								onClick={() => setTab(t.id)}
								aria-current={tab === t.id ? "page" : undefined}
								className="adm-tab label"
							>
								{t.label}
								{t.id === "leads" && stats.new_count > 0 ? (
									<span className="badge">{stats.new_count}</span>
								) : null}
							</button>
						))}
					</nav>

					<div className="adm-tools">
						<div role="radiogroup" aria-label="Цвет акцента" className="accents">
							{ACCENTS.map((a) => (
								<button
									key={a.id}
									type="button"
									role="radio"
									aria-checked={accent === a.id}
									aria-label={a.label}
									onClick={() => pickAccent(a.id)}
								>
									<span style={{ background: a.color }} />
								</button>
							))}
						</div>
						<a
							href={SITE_URL}
							target="_blank"
							rel="noreferrer"
							className="btn btn-ghost btn-sm"
							title="Открыть imtrtd.space"
						>
							Сайт ↗
						</a>
						<button
							type="button"
							className="btn btn-ghost btn-sm"
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

			<main className="wrap adm-main">
				{error ? (
					<div style={{ marginBottom: "1.5rem" }}>
						<ErrorBox text={error} />
					</div>
				) : null}

				{tab === "dashboard" ? (
					<DashboardPanel
						stats={stats}
						leads={statusFilter ? [] : leads}
						onOpenLeads={(status) => {
							setStatusFilter(status);
							setTab("leads");
						}}
					/>
				) : null}

				{tab === "leads" ? (
					<LeadsPanel
						leads={leads}
						stats={stats}
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
						canDelete={isOwner}
					/>
				) : null}

				{tab === "services" && content ? (
					<ServicesPanel
						services={content.services}
						onSaved={load}
						setError={setError}
						busy={busy}
						setBusy={setBusy}
						canDelete={isOwner}
					/>
				) : null}
			</main>
		</div>
	);
}

function ErrorBox({ text }: { text: string }) {
	return (
		<p className="msg" data-kind="err" role="alert">
			<b>Не получилось.</b> {text}
		</p>
	);
}

function SecHead({
	n,
	title,
	children,
	aside,
}: {
	n: string;
	title: string;
	children?: ReactNode;
	aside?: ReactNode;
}) {
	return (
		<div className="sec-head">
			<div>
				<p className="label sec-index">
					{n} · {title}
				</p>
				<h1 className="display-md" style={{ marginTop: "0.9rem" }}>
					{title}
				</h1>
				{children ? <p>{children}</p> : null}
			</div>
			{aside ? <div>{aside}</div> : null}
		</div>
	);
}

function StatusChip({ status }: { status: LeadStatus }) {
	return (
		<span className="chip" data-st={status}>
			<span className="dot" aria-hidden="true" />
			{STATUS_LABEL[status] ?? status}
		</span>
	);
}

function formatDate(iso: string) {
	return new Date(iso).toLocaleString("ru-RU", {
		day: "2-digit",
		month: "2-digit",
		year: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
	});
}

function DashboardPanel({
	stats,
	leads,
	onOpenLeads,
}: {
	stats: LeadStats;
	leads: Lead[];
	onOpenLeads: (status: string) => void;
}) {
	const cards = [
		{ label: "За неделю", value: stats.week, filter: "", alert: false },
		{ label: "Новые", value: stats.new_count, filter: "new", alert: false },
		{ label: "В работе", value: stats.in_progress, filter: "in_progress", alert: false },
		{
			label: "Без ответа > 24 ч",
			value: stats.stale_over_24h,
			filter: "new",
			alert: stats.stale_over_24h > 0,
		},
	];
	const recent = leads.slice(0, 5);

	return (
		<section>
			<SecHead n="01" title="Сводка">
				Всего заявок: {stats.total}. О «висящих» заявках раз в час приходит напоминание на
				почту.
			</SecHead>

			<div className="stats">
				{cards.map((c) => (
					<button
						key={c.label}
						type="button"
						className="stat"
						data-alert={c.alert}
						onClick={() => onOpenLeads(c.filter)}
					>
						<span className="label t-mute">{c.label}</span>
						<span className="num" style={c.alert ? undefined : { color: "var(--signal)" }}>
							{c.value}
						</span>
						<span className="foot label">
							Открыть <span className="arrow" aria-hidden="true">→</span>
						</span>
					</button>
				))}
			</div>

			<div className="sub">
				<p className="label sec-index">Последние заявки</p>
				<button type="button" className="label t-mute" onClick={() => onOpenLeads("")}>
					Все →
				</button>
			</div>
			{recent.length === 0 ? (
				<p className="empty">Заявок пока нет.</p>
			) : (
				<ul className="rows">
					{recent.map((lead) => (
						<li key={lead.id} className="row-item">
							<div style={{ minWidth: 0 }}>
								<p className="row-title">{lead.name}</p>
								<p className="row-sub">
									{lead.task_type || "Тип не указан"} · {formatDate(lead.created_at)}
								</p>
							</div>
							<StatusChip status={lead.status} />
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function LeadsPanel({
	leads,
	stats,
	statusFilter,
	setStatusFilter,
	onRefresh,
	busy,
	setBusy,
	setError,
}: {
	leads: Lead[];
	stats: LeadStats;
	statusFilter: string;
	setStatusFilter: (v: string) => void;
	onRefresh: () => Promise<void>;
	busy: boolean;
	setBusy: (v: boolean) => void;
	setError: (v: string) => void;
}) {
	async function patch(
		id: string,
		data: {
			status?: LeadStatus;
			note?: string;
			next_step?: string;
			brief_url?: string;
		},
	) {
		setBusy(true);
		setError("");
		try {
			await adminUpdateLead(id, data);
			await onRefresh();
		} catch (err) {
			setError(errText(err, "Ошибка обновления"));
		} finally {
			setBusy(false);
		}
	}

	const counts: Partial<Record<string, number>> = {
		"": stats.total,
		new: stats.new_count,
		in_progress: stats.in_progress,
	};
	const filters: [string, string][] = [
		["", "Все"],
		...STATUSES.map((s) => [s, STATUS_LABEL[s]] as [string, string]),
	];

	return (
		<section>
			<SecHead
				n="02"
				title="Заявки"
				aside={
					<button type="button" onClick={() => void onRefresh()} className="btn btn-ghost">
						Обновить
					</button>
				}
			>
				Заявки с формы на imtrtd.space. Статус, заметка и следующий шаг сохраняются сразу.
			</SecHead>

			<div className="opts" role="group" aria-label="Фильтр по статусу" style={{ marginBottom: "1.5rem" }}>
				{filters.map(([value, label]) => (
					<button
						key={value || "all"}
						type="button"
						className="opt"
						aria-pressed={statusFilter === value}
						onClick={() => setStatusFilter(value)}
					>
						{label}
						{counts[value] !== undefined ? <span className="n">{counts[value]}</span> : null}
					</button>
				))}
			</div>

			{leads.length === 0 ? (
				<p className="empty">
					{statusFilter ? "С таким статусом заявок нет." : "Заявок пока нет."}
				</p>
			) : (
				<ul className="stack">
					{leads.map((lead) => (
						<li key={lead.id} className="card lead">
							<div className="lead-top">
								<div style={{ minWidth: 0 }}>
									<p className="lead-name">{lead.name}</p>
									<a
										className="lead-contact"
										href={contactHref(lead.contact)}
										target="_blank"
										rel="noreferrer"
									>
										{lead.contact}
									</a>
									<p className="label t-mute" style={{ marginTop: "0.5rem" }}>
										{formatDate(lead.created_at)} · {lead.id.slice(0, 8)}
									</p>
								</div>
								<label className="fld">
									<span className="label">Статус</span>
									<select
										disabled={busy}
										value={lead.status}
										onChange={(e) =>
											void patch(lead.id, {
												status: e.target.value as LeadStatus,
											})
										}
										className="field lead-status"
										data-st={lead.status}
									>
										{STATUSES.map((s) => (
											<option key={s} value={s}>
												{STATUS_LABEL[s]}
											</option>
										))}
									</select>
								</label>
							</div>

							<div className="lead-meta">
								<span className="chip">{lead.task_type || "Тип не указан"}</span>
								{lead.budget ? <span className="chip">{lead.budget}</span> : null}
								{lead.first_response_at ? (
									<span className="chip" data-st="done">
										Ответ: {formatDate(lead.first_response_at)}
									</span>
								) : null}
							</div>

							{lead.message ? <p className="lead-msg">{lead.message}</p> : null}

							<label className="fld">
								<span className="label">Заметка</span>
								<textarea
									defaultValue={lead.note}
									rows={2}
									className="field"
									onBlur={(e) => {
										if (e.target.value !== lead.note) {
											void patch(lead.id, { note: e.target.value });
										}
									}}
								/>
							</label>
							<div className="grid-2">
								<label className="fld">
									<span className="label">Следующий шаг</span>
									<input
										defaultValue={lead.next_step ?? ""}
										className="field"
										onBlur={(e) => {
											if (e.target.value !== (lead.next_step ?? "")) {
												void patch(lead.id, { next_step: e.target.value });
											}
										}}
									/>
								</label>
								<label className="fld">
									<span className="label">Ссылка на бриф</span>
									<input
										defaultValue={lead.brief_url ?? ""}
										placeholder="https://…"
										className="field"
										onBlur={(e) => {
											if (e.target.value !== (lead.brief_url ?? "")) {
												void patch(lead.id, { brief_url: e.target.value });
											}
										}}
									/>
								</label>
							</div>
							{lead.brief_url ? (
								<a
									href={lead.brief_url}
									target="_blank"
									rel="noreferrer"
									className="label t-signal"
								>
									Открыть бриф <span className="arrow" aria-hidden="true">→</span>
								</a>
							) : null}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}

function contactHref(contact: string) {
	if (contact.includes("@") && !contact.startsWith("@")) {
		return `mailto:${contact}`;
	}
	const handle = contact.replace(/^@/, "");
	return `https://t.me/${handle}`;
}

type CopyField = { key: string; label: string; rows?: number; hint?: string };

const SITE_FIELDS: CopyField[] = [
	{ key: "hq_hero_line", label: "Строка под заголовком", rows: 3 },
	{ key: "hq_contact_email", label: "Email" },
	{ key: "hq_contact_telegram", label: "Telegram", hint: "С @ или без." },
];

const STUDIO_FIELDS: CopyField[] = [
	{ key: "brand", label: "Бренд" },
	{ key: "headline", label: "Заголовок", rows: 2 },
	{ key: "subhead", label: "Подзаголовок", rows: 3 },
	{ key: "cta_label", label: "Кнопка (CTA)" },
	{ key: "contact_email", label: "Email" },
	{ key: "contact_telegram", label: "Telegram" },
	{ key: "cf_beacon_token", label: "Cloudflare Web Analytics token" },
];

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
	const [saved, setSaved] = useState(false);

	useEffect(() => {
		setDraft(copy);
	}, [copy]);

	async function save(event: FormEvent) {
		event.preventDefault();
		setBusy(true);
		setError("");
		setSaved(false);
		try {
			await adminSaveCopy(draft);
			await onSaved();
			setSaved(true);
		} catch (err) {
			setError(errText(err, "Ошибка сохранения"));
		} finally {
			setBusy(false);
		}
	}

	function set(key: string, value: string) {
		setSaved(false);
		setDraft((prev) => ({ ...prev, [key]: value }));
	}

	function renderField(f: CopyField) {
		return (
			<label key={f.key} className="fld">
				<span className="label">{f.label}</span>
				{f.rows ? (
					<textarea
						rows={f.rows}
						value={draft[f.key] ?? ""}
						onChange={(e) => set(f.key, e.target.value)}
						className="field"
					/>
				) : (
					<input
						value={draft[f.key] ?? ""}
						onChange={(e) => set(f.key, e.target.value)}
						className="field"
					/>
				)}
				{f.hint ? <span className="fld-hint">{f.hint}</span> : null}
			</label>
		);
	}

	const cmsOn = draft.hq_cms === "on";

	return (
		<form onSubmit={save}>
			<SecHead n="03" title="Тексты">
				Строки для imtrtd.space и для студийной страницы на admin.imtrtd.space.
			</SecHead>

			<div className="card group">
				<div className="group-head">
					<p className="label sec-index">imtrtd.space</p>
					<div className="switch" role="group" aria-label="Контент из админки">
						<button type="button" aria-pressed={cmsOn} onClick={() => set("hq_cms", "on")}>
							Вкл
						</button>
						<button type="button" aria-pressed={!cmsOn} onClick={() => set("hq_cms", "off")}>
							Выкл
						</button>
					</div>
				</div>
				<p className="fld-hint">
					{cmsOn
						? "Сайт берёт кейсы, услуги и контакты из админки. Изменения появляются после следующей сборки сайта (каждый день или при деплое)."
						: "Сайт показывает свой статичный контент; поля ниже сохраняются, но не применяются."}
				</p>
				<div className="grid-2">
					{SITE_FIELDS.map((f) => (
						<div key={f.key} className={f.rows ? "span-2" : undefined}>
							{renderField(f)}
						</div>
					))}
				</div>
			</div>

			<div className="card group">
				<p className="label sec-index">Студийная страница</p>
				<div className="grid-2">
					{STUDIO_FIELDS.map((f) => (
						<div key={f.key} className={f.rows ? "span-2" : undefined}>
							{renderField(f)}
						</div>
					))}
				</div>
			</div>

			<div className="savebar">
				<button type="submit" disabled={busy} className="btn btn-primary">
					{busy ? "Сохраняю…" : "Сохранить тексты"}
				</button>
				{saved ? (
					<span className="label" style={{ color: "var(--ok)" }}>
						Сохранено
					</span>
				) : null}
			</div>
		</form>
	);
}

function CasesPanel({
	cases,
	onSaved,
	setError,
	busy,
	setBusy,
	canDelete,
}: {
	cases: CaseItem[];
	onSaved: () => Promise<void>;
	setError: (v: string) => void;
	busy: boolean;
	setBusy: (v: boolean) => void;
	canDelete: boolean;
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
			setError(errText(err, "Ошибка сохранения"));
		} finally {
			setBusy(false);
		}
	}

	async function onUpload(file: File | null) {
		if (!file) {
			return;
		}
		setBusy(true);
		setError("");
		try {
			const uploaded = await adminUploadMedia(file);
			setDraft((prev) => ({ ...prev, image_url: uploaded.url }));
		} catch (err) {
			setError(errText(err, "Ошибка загрузки"));
		} finally {
			setBusy(false);
		}
	}

	async function run(action: () => Promise<unknown>) {
		setBusy(true);
		try {
			await action();
			await onSaved();
		} catch (err) {
			setError(errText(err, "Ошибка"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<section>
			<SecHead n="04" title="Кейсы">
				Карточки работ. На imtrtd.space кейс находится по ссылке на /work/… в поле картинки.
			</SecHead>

			<ul className="rows">
				{cases.map((item) => (
					<li key={item.id} className="row-item">
						<div className="row-main">
							{item.image_url ? <img src={item.image_url} alt="" /> : null}
							<div style={{ minWidth: 0 }}>
								<p className="row-title">
									{item.title}{" "}
									<span className="chip" data-st={item.published ? "done" : "archived"}>
										{item.published ? "Опубликован" : "Черновик"}
									</span>
								</p>
								<p className="row-sub">
									{[item.role, item.result].filter(Boolean).join(" · ")}
								</p>
							</div>
						</div>
						<div className="row-actions">
							<button
								type="button"
								className="btn btn-ghost btn-sm"
								disabled={busy}
								onClick={() =>
									void run(() =>
										adminSaveCase({ ...item, published: item.published ? 0 : 1 }),
									)
								}
							>
								{item.published ? "Скрыть" : "Опубликовать"}
							</button>
							{canDelete ? (
								<button
									type="button"
									className="btn btn-danger btn-sm"
									disabled={busy}
									onClick={() => {
										if (window.confirm(`Удалить кейс «${item.title}»?`)) {
											void run(() => adminDeleteCase(item.id));
										}
									}}
								>
									Удалить
								</button>
							) : null}
						</div>
					</li>
				))}
			</ul>

			<div className="sub">
				<p className="label sec-index">Новый кейс</p>
			</div>
			<form onSubmit={save} className="card form grid-2">
				<label className="fld">
					<span className="label">Название</span>
					<input
						required
						value={draft.title}
						onChange={(e) => setDraft({ ...draft, title: e.target.value })}
						className="field"
					/>
				</label>
				<label className="fld">
					<span className="label">Вид · место</span>
					<input
						placeholder="Tattoo studio · Nürnberg"
						value={draft.role}
						onChange={(e) => setDraft({ ...draft, role: e.target.value })}
						className="field"
					/>
				</label>
				<label className="fld span-2">
					<span className="label">Результат</span>
					<input
						value={draft.result}
						onChange={(e) => setDraft({ ...draft, result: e.target.value })}
						className="field"
					/>
				</label>
				<label className="fld">
					<span className="label">Картинка или ссылка</span>
					<input
						placeholder="https://… или /work/slug"
						value={draft.image_url}
						onChange={(e) => setDraft({ ...draft, image_url: e.target.value })}
						className="field"
					/>
				</label>
				<label className="fld">
					<span className="label">Загрузить файл</span>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp,image/gif"
						onChange={(e) => void onUpload(e.target.files?.[0] ?? null)}
						className="field"
					/>
				</label>
				<div className="span-2">
					<button type="submit" disabled={busy} className="btn btn-primary">
						Добавить кейс
					</button>
				</div>
			</form>
		</section>
	);
}

function ServicesPanel({
	services,
	onSaved,
	setError,
	busy,
	setBusy,
	canDelete,
}: {
	services: ServiceItem[];
	onSaved: () => Promise<void>;
	setError: (v: string) => void;
	busy: boolean;
	setBusy: (v: boolean) => void;
	canDelete: boolean;
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
			setError(errText(err, "Ошибка сохранения"));
		} finally {
			setBusy(false);
		}
	}

	return (
		<section>
			<SecHead n="05" title="Услуги">
				На imtrtd.space услуги подменяются по порядку: первая строка здесь — первая карточка на
				сайте.
			</SecHead>

			<ul className="rows">
				{services.map((item, i) => (
					<li key={item.id} className="row-item">
						<div className="row-main">
							<span className="label t-signal">{String(i + 1).padStart(2, "0")}</span>
							<div style={{ minWidth: 0 }}>
								<p className="row-title">{item.title}</p>
								<p className="row-sub">{item.description}</p>
							</div>
						</div>
						{canDelete ? (
							<button
								type="button"
								className="btn btn-danger btn-sm"
								disabled={busy}
								onClick={() => {
									if (!window.confirm(`Удалить услугу «${item.title}»?`)) return;
									void (async () => {
										setBusy(true);
										try {
											await adminDeleteService(item.id);
											await onSaved();
										} catch (err) {
											setError(errText(err, "Ошибка"));
										} finally {
											setBusy(false);
										}
									})();
								}}
							>
								Удалить
							</button>
						) : null}
					</li>
				))}
			</ul>

			<div className="sub">
				<p className="label sec-index">Новая услуга</p>
			</div>
			<form onSubmit={save} className="card form">
				<label className="fld">
					<span className="label">Название</span>
					<input
						required
						value={draft.title}
						onChange={(e) => setDraft({ ...draft, title: e.target.value })}
						className="field"
					/>
				</label>
				<label className="fld">
					<span className="label">Описание</span>
					<textarea
						rows={3}
						value={draft.description}
						onChange={(e) => setDraft({ ...draft, description: e.target.value })}
						className="field"
					/>
				</label>
				<div>
					<button type="submit" disabled={busy} className="btn btn-primary">
						Добавить услугу
					</button>
				</div>
			</form>
		</section>
	);
}
