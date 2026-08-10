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

	return (
		<div className="relative min-h-screen overflow-x-hidden bg-ink text-paper">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
			>
				<div className="animate-drift absolute -left-24 top-[-10%] h-[55vh] w-[55vh] rounded-full bg-[radial-gradient(circle,rgba(210,243,92,0.22),transparent_65%)] blur-2xl" />
				<div className="animate-drift absolute right-[-10%] top-[20%] h-[48vh] w-[48vh] rounded-full bg-[radial-gradient(circle,rgba(120,140,255,0.16),transparent_70%)] blur-2xl [animation-delay:-4s]" />
				<div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(16,18,24,0.2),rgba(16,18,24,0.92)),repeating-linear-gradient(90deg,transparent,transparent_79px,rgba(255,255,255,0.025)_80px)]" />
			</div>

			<header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 md:px-8">
				<a href="/" className="font-display text-lg font-bold tracking-tight md:text-xl">
					{brand}
				</a>
				<nav className="flex items-center gap-5 text-sm text-fog">
					<a href="#work" className="transition hover:text-paper">
						Работы
					</a>
					<a href="#services" className="hidden transition hover:text-paper sm:inline">
						Услуги
					</a>
					<a
						href="#lead"
						className="rounded-full bg-signal px-4 py-2 font-semibold text-ink transition hover:bg-signal-deep"
					>
						{cta}
					</a>
				</nav>
			</header>

			<section className="relative mx-auto flex min-h-[calc(100vh-5.5rem)] w-full max-w-6xl flex-col justify-end px-6 pb-16 pt-10 md:px-8 md:pb-24">
				<div className="animate-signal pointer-events-none absolute right-8 top-10 hidden h-28 w-28 rounded-full border border-signal/40 md:block" />
				<p className="animate-rise font-display text-sm font-semibold uppercase tracking-[0.22em] text-signal">
					{brand}
				</p>
				<h1 className="animate-rise mt-5 max-w-4xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-paper sm:text-6xl md:text-7xl [animation-delay:80ms]">
					{headline}
				</h1>
				<p className="animate-rise mt-6 max-w-xl text-base text-fog sm:text-lg [animation-delay:160ms]">
					{subhead}
				</p>
				<div className="animate-rise mt-10 flex flex-wrap gap-4 [animation-delay:240ms]">
					<a
						href="#lead"
						className="rounded-full bg-signal px-7 py-3 text-sm font-semibold text-ink transition hover:bg-signal-deep"
					>
						{cta}
					</a>
					<a
						href="#work"
						className="rounded-full border border-white/15 px-7 py-3 text-sm font-medium text-paper transition hover:border-white/35"
					>
						Смотреть работы
					</a>
				</div>
			</section>

			<section id="work" className="mx-auto w-full max-w-6xl px-6 py-20 md:px-8">
				<div className="mb-10 max-w-2xl">
					<h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
						Работы
					</h2>
					<p className="mt-3 text-mist">
						Коротко о результате — без лишней витрины.
					</p>
				</div>
				<div className="grid gap-8 md:grid-cols-2">
					{content.cases.map((item, index) => (
						<article
							key={item.id}
							className="group border-t border-white/10 pt-6"
						>
							<div
								className="mb-5 aspect-[16/10] overflow-hidden rounded-2xl bg-ink-soft"
								style={{
									backgroundImage: item.image_url
										? `url(${item.image_url})`
										: `linear-gradient(135deg, rgba(210,243,92,${0.08 + (index % 3) * 0.05}), rgba(255,255,255,0.04) 45%, rgba(90,110,220,0.18))`,
									backgroundSize: "cover",
									backgroundPosition: "center",
								}}
							/>
							<p className="text-sm uppercase tracking-[0.16em] text-signal">
								{item.role}
							</p>
							<h3 className="mt-2 font-display text-2xl font-bold">{item.title}</h3>
							<p className="mt-2 text-mist">{item.result}</p>
						</article>
					))}
				</div>
			</section>

			<section id="services" className="mx-auto w-full max-w-6xl px-6 py-20 md:px-8">
				<div className="mb-10 max-w-2xl">
					<h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
						Услуги
					</h2>
					<p className="mt-3 text-mist">Один фокус на раздел — ясный результат.</p>
				</div>
				<ul className="space-y-0">
					{content.services.map((service) => (
						<li
							key={service.id}
							className="grid gap-3 border-t border-white/10 py-7 md:grid-cols-[0.35fr_1fr] md:gap-10"
						>
							<h3 className="font-display text-xl font-semibold">{service.title}</h3>
							<p className="text-fog">{service.description}</p>
						</li>
					))}
				</ul>
			</section>

			<section className="mx-auto w-full max-w-6xl px-6 py-20 md:px-8">
				<div className="max-w-2xl">
					<h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
						Как работаем
					</h2>
					<p className="mt-3 text-mist">Короткий цикл без лишних созвонов.</p>
				</div>
				<ol className="mt-10 grid gap-8 md:grid-cols-3">
					{[
						["01", "Бриф", "Собираем цель, ограничения и критерии успеха."],
						["02", "Направление", "1–2 визуальных направления и структура."],
						["03", "Сборка", "Финальные экраны/носители и передача команде."],
					].map(([num, title, text]) => (
						<li key={num}>
							<p className="font-display text-signal">{num}</p>
							<h3 className="mt-3 font-display text-xl font-semibold">{title}</h3>
							<p className="mt-2 text-mist">{text}</p>
						</li>
					))}
				</ol>
			</section>

			<section id="lead" className="mx-auto w-full max-w-6xl px-6 py-20 md:px-8">
				<div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
					<div>
						<h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
							Оставить заявку
						</h2>
						<p className="mt-3 max-w-md text-mist">
							Расскажите о задаче — вернёмся с вопросами и следующим шагом.
						</p>
						<div className="mt-8 space-y-2 text-sm text-fog">
							<p>
								Email:{" "}
								<a className="text-paper hover:text-signal" href={`mailto:${email}`}>
									{email}
								</a>
							</p>
							<p>
								Telegram:{" "}
								<a
									className="text-paper hover:text-signal"
									href={`https://t.me/${telegram.replace("@", "")}`}
									target="_blank"
									rel="noreferrer"
								>
									{telegram}
								</a>
							</p>
						</div>
					</div>
					<LeadForm />
				</div>
			</section>

			<footer className="border-t border-white/10 px-6 py-8 md:px-8">
				<div className="mx-auto flex w-full max-w-6xl flex-col gap-3 text-sm text-mist sm:flex-row sm:items-center sm:justify-between">
					<p>{brand}</p>
					<p>imtryingtodesign.com</p>
				</div>
			</footer>
		</div>
	);
}
