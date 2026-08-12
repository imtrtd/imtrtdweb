import { useEffect, useState } from "react";
import type { SiteContent } from "../types";
import { fetchContent } from "../lib/api";
import { FALLBACK_CONTENT } from "../lib/fallback";
import { LeadForm } from "../components/landing/LeadForm";

export function LandingPage() {
	const [content, setContent] = useState<SiteContent>(FALLBACK_CONTENT);

	useEffect(() => {
		let cancelled = false;
		fetchContent()
			.then((data) => {
				if (!cancelled) {
					setContent({
						copy: { ...FALLBACK_CONTENT.copy, ...data.copy },
						cases: data.cases?.length ? data.cases : FALLBACK_CONTENT.cases,
						services: data.services?.length
							? data.services
							: FALLBACK_CONTENT.services,
					});
				}
			})
			.catch(() => {
				/* keep fallback */
			});
		return () => {
			cancelled = true;
		};
	}, []);

	const brand = content.copy.brand || FALLBACK_CONTENT.copy.brand;
	const headline = content.copy.headline || FALLBACK_CONTENT.copy.headline;
	const subhead = content.copy.subhead || FALLBACK_CONTENT.copy.subhead;
	const cta = content.copy.cta_label || FALLBACK_CONTENT.copy.cta_label;
	const email = content.copy.contact_email || FALLBACK_CONTENT.copy.contact_email;
	const telegram =
		content.copy.contact_telegram || FALLBACK_CONTENT.copy.contact_telegram;
	const beaconToken = content.copy.cf_beacon_token?.trim() || "";
	const workItems = content.cases.slice(0, 3);
	const processSteps = [
		["01", "Бриф", "Собираем цель, ограничения и критерии успеха."],
		["02", "Направление", "1–2 визуальных направления и структура."],
		["03", "Сборка", "Финальные экраны, носители и передача команде."],
	];
	const metrics = [
		{ label: "Проектов", value: "12+" },
		{ label: "Средний цикл", value: "2–4 недели" },
		{ label: "Направлений", value: "Brand / UI / Landing" },
	];

	useEffect(() => {
		if (!beaconToken) {
			return;
		}
		const existing = document.querySelector("script[data-cf-beacon]");
		if (existing) {
			return;
		}
		const script = document.createElement("script");
		script.defer = true;
		script.src = "https://static.cloudflareinsights.com/beacon.min.js";
		script.setAttribute(
			"data-cf-beacon",
			JSON.stringify({ token: beaconToken }),
		);
		document.body.appendChild(script);
		return () => {
			script.remove();
		};
	}, [beaconToken]);

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-ink text-paper">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
			>
				<div className="animate-drift absolute -left-24 top-[-10%] h-[55vh] w-[55vh] rounded-full bg-[radial-gradient(circle,rgba(210,243,92,0.22),transparent_65%)] blur-2xl" />
				<div className="animate-drift absolute right-[-10%] top-[20%] h-[48vh] w-[48vh] rounded-full bg-[radial-gradient(circle,rgba(120,140,255,0.16),transparent_70%)] blur-2xl [animation-delay:-4s]" />
				<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,18,24,0.2),rgba(16,18,24,0.92)),repeating-linear-gradient(90deg,transparent,transparent_79px,rgba(255,255,255,0.03)_80px)]" />
			</div>

			<header className="sticky top-0 z-20 border-b border-white/10 bg-ink/80 backdrop-blur-xl">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-8">
					<a href="/" className="flex items-center gap-3 font-display text-lg font-bold tracking-tight md:text-xl">
						<span className="flex h-2.5 w-2.5 rounded-full bg-signal shadow-[0_0_18px_rgba(210,243,92,0.85)]" />
						{brand}
					</a>
					<nav className="hidden items-center gap-6 text-sm text-fog md:flex">
						<a href="#work" className="transition hover:text-paper">
							Работы
						</a>
						<a href="#services" className="transition hover:text-paper">
							Услуги
						</a>
						<a href="#process" className="transition hover:text-paper">
							Процесс
						</a>
						<a
							href="#lead"
							className="rounded-full bg-signal px-4 py-2 font-semibold text-ink transition hover:bg-signal-deep"
						>
							{cta}
						</a>
					</nav>
				</div>
			</header>

			<main>
				<section className="relative mx-auto w-full max-w-6xl px-6 pb-16 pt-10 md:px-8 md:pb-24 md:pt-16">
					<div className="grid items-end gap-10 lg:grid-cols-[1.15fr_0.85fr]">
						<div>
							<div className="inline-flex items-center gap-2 rounded-full border border-signal/30 bg-signal/8 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-signal">
								<span className="h-1.5 w-1.5 rounded-full bg-signal" />
								{brand}
							</div>
							<h1 className="animate-rise mt-6 max-w-4xl font-display text-4xl font-extrabold leading-[0.96] tracking-[-0.06em] text-paper sm:text-6xl md:text-7xl [animation-delay:80ms]">
								{headline}
							</h1>
							<p className="animate-rise mt-6 max-w-xl text-base leading-7 text-fog sm:text-lg [animation-delay:160ms]">
								{subhead}
							</p>
							<div className="animate-rise mt-8 flex flex-wrap gap-4 [animation-delay:240ms]">
								<a
									href="#lead"
									className="rounded-full bg-signal px-7 py-3 text-sm font-semibold text-ink transition hover:bg-signal-deep"
								>
									{cta}
								</a>
								<a
									href="#work"
									className="rounded-full border border-white/15 bg-white/[0.02] px-7 py-3 text-sm font-medium text-paper transition hover:border-white/35"
								>
									Смотреть работы
								</a>
							</div>
						</div>

						<div className="relative">
							<div className="animate-signal pointer-events-none absolute -right-8 top-2 hidden h-20 w-20 rounded-full border border-signal/40 md:block" />
							<div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.38)] backdrop-blur-sm md:p-6">
								<div className="flex items-center justify-between border-b border-white/10 pb-4">
									<div>
										<p className="text-[10px] uppercase tracking-[0.22em] text-mist">Direction</p>
										<h2 className="mt-2 font-display text-2xl text-paper">Studio system</h2>
									</div>
									<div className="rounded-full border border-signal/30 bg-signal/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em] text-signal">
										Live
									</div>
								</div>
								<div className="mt-5 grid gap-3">
									<div className="rounded-2xl border border-white/10 bg-ink-soft/70 p-4">
										<p className="text-xs uppercase tracking-[0.18em] text-mist">Brand</p>
										<div className="mt-3 flex items-center justify-between gap-4">
											<div>
												<p className="font-display text-xl text-paper">Visual language</p>
												<p className="mt-1 text-sm text-fog">Концепции под продукт и рынок</p>
											</div>
											<div className="h-12 w-12 rounded-xl bg-[linear-gradient(135deg,#d2f35c,#c8cedb)]" />
										</div>
									</div>
									<div className="grid gap-3 sm:grid-cols-3">
										{metrics.map((item) => (
											<div key={item.label} className="rounded-2xl border border-white/10 bg-[#121821] p-3">
												<p className="text-[10px] uppercase tracking-[0.18em] text-mist">{item.label}</p>
												<p className="mt-2 text-base font-semibold text-paper">{item.value}</p>
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</div>
				</section>

				<section id="work" className="mx-auto w-full max-w-6xl px-6 py-20 md:px-8">
					<div className="mb-10 flex items-end justify-between gap-4">
						<div className="max-w-2xl">
							<p className="text-[11px] font-medium uppercase tracking-[0.2em] text-signal">Selected work</p>
							<h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
								Работы
							</h2>
						</div>
						<a href="#lead" className="hidden text-sm text-fog transition hover:text-paper md:inline">
							Обсудить задачу →
						</a>
					</div>
					<div className="grid gap-6 md:grid-cols-3">
						{workItems.map((item, index) => (
							<article
								key={item.id}
								className="group rounded-[24px] border border-white/10 bg-white/[0.02] p-3 transition hover:-translate-y-1 hover:border-signal/30"
							>
								<div
									className="aspect-[16/12] overflow-hidden rounded-[18px] bg-ink-soft"
									style={{
										backgroundImage: item.image_url
											? `url(${item.image_url})`
											: `linear-gradient(135deg, rgba(210,243,92,${0.14 + index * 0.05}), rgba(255,255,255,0.04) 42%, rgba(90,110,220,0.2))`,
										backgroundSize: "cover",
										backgroundPosition: "center",
									}}
								/>
								<div className="px-1 pb-1 pt-4">
									<p className="text-[10px] uppercase tracking-[0.18em] text-signal">{item.role}</p>
									<h3 className="mt-3 font-display text-2xl font-bold text-paper">{item.title}</h3>
									<p className="mt-2 text-sm leading-6 text-mist">{item.result}</p>
								</div>
							</article>
						))}
					</div>
				</section>

				<section id="services" className="mx-auto w-full max-w-6xl px-6 py-20 md:px-8">
					<div className="mb-10 max-w-2xl">
						<p className="text-[11px] font-medium uppercase tracking-[0.2em] text-signal">Services</p>
						<h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
							Услуги
						</h2>
					</div>
					<div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
						{content.services.map((service) => (
							<div
								key={service.id}
								className="rounded-[22px] border border-white/10 bg-white/[0.02] p-5 transition hover:border-signal/30 hover:bg-white/[0.03]"
							>
								<p className="text-[10px] uppercase tracking-[0.18em] text-mist">Offer</p>
								<h3 className="mt-4 font-display text-xl font-bold text-paper">{service.title}</h3>
								<p className="mt-3 text-sm leading-6 text-fog">{service.description}</p>
							</div>
						))}
					</div>
				</section>

				<section id="process" className="mx-auto w-full max-w-6xl px-6 py-20 md:px-8">
					<div className="max-w-2xl">
						<p className="text-[11px] font-medium uppercase tracking-[0.2em] text-signal">Process</p>
						<h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
							Как работаем
						</h2>
					</div>
					<div className="mt-10 grid gap-5 md:grid-cols-3">
						{processSteps.map(([num, title, text]) => (
							<div key={num} className="rounded-[22px] border border-white/10 bg-[#121821] p-5">
								<p className="font-display text-signal">{num}</p>
								<h3 className="mt-3 font-display text-xl font-semibold text-paper">{title}</h3>
								<p className="mt-2 text-sm leading-6 text-mist">{text}</p>
							</div>
						))}
					</div>
				</section>

				<section id="lead" className="mx-auto w-full max-w-6xl px-6 py-20 md:px-8">
					<div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
						<div className="flex flex-col justify-between rounded-[28px] border border-white/10 bg-white/[0.02] p-6 md:p-8">
							<div>
								<p className="text-[11px] font-medium uppercase tracking-[0.2em] text-signal">Contact</p>
								<h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
									Оставить заявку
								</h2>
								<p className="mt-3 max-w-md text-mist">
									Расскажите о задаче — вернёмся с вопросами и следующим шагом.
								</p>
							</div>
							<div className="mt-8 space-y-4 text-sm text-fog">
								<p className="flex items-center gap-2">
									<span className="text-paper">Email:</span>
									<a className="text-fog transition hover:text-signal" href={`mailto:${email}`}>
										{email}
									</a>
								</p>
								<p className="flex items-center gap-2">
									<span className="text-paper">Telegram:</span>
									<a
										className="text-fog transition hover:text-signal"
										href={`https://t.me/${telegram.replace("@", "")}`}
										target="_blank"
										rel="noreferrer"
									>
										{telegram}
									</a>
								</p>
							</div>
						</div>
						<div className="rounded-[28px] border border-white/10 bg-white/[0.02] p-4 md:p-6">
							<LeadForm />
						</div>
					</div>
				</section>
			</main>

			<footer className="border-t border-white/10 px-6 py-8 md:px-8">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-sm text-mist sm:flex-row sm:items-center sm:justify-between">
					<p>{brand}</p>
					<p>imtryingtodesign.com</p>
				</div>
			</footer>
		</div>
	);
}
