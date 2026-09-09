import type { CSSProperties } from "react";
import { getProject, STATUS_LABELS } from "../data/projects";

export function WorkPage({ slug }: { slug: string }) {
	const study = getProject(slug);
	if (!study || study.slug === "imtrtd") {
		return (
			<main className="systems-page">
				<nav className="systems-nav">
					<a className="case-back" href="/#work">
						← HOME
					</a>
				</nav>
				<section className="systems-intro">
					<h1>NOT FOUND.</h1>
				</section>
			</main>
		);
	}

	const caseStyle = { "--case-accent": study.accent } as CSSProperties;
	const liveLinks = study.links.filter((l) => l.external);
	const caseHref = study.links.find((l) => !l.external && l.href.startsWith("/work"));

	return (
		<main className={`case-page case-${study.slug}`} style={caseStyle}>
			<nav className="case-nav">
				<a className="case-back" href="/#work">
					BACK TO WORK
				</a>
				<span className="mono">
					{STATUS_LABELS[study.status]} · {study.year} · {study.location}
				</span>
			</nav>

			<section className="case-hero case-hero-media">
				<div>
					<p className="case-label mono">{study.type}</p>
					<h1>{study.title}</h1>
					{study.domain ? (
						<p className="case-domain mono">
							{study.external ? (
								<a href={study.href} target="_blank" rel="noreferrer">
									{study.domain} ↗
								</a>
							) : (
								study.domain
							)}
						</p>
					) : null}
				</div>
				<div>
					<p className="case-intro">{study.description}</p>
					<p className="case-note mono">{study.tagline.toUpperCase()}</p>
				</div>
			</section>

			<figure className="case-cover">
				<img src={study.image} alt={`${study.title} cover`} loading="eager" />
			</figure>

			<section className="case-links">
				{study.links.map((link) => (
					<a
						key={link.href + link.label}
						className="case-link mono"
						href={link.href}
						{...(link.external ? { target: "_blank", rel: "noreferrer" } : {})}
					>
						{link.label}
						{link.external ? " ↗" : " →"}
					</a>
				))}
			</section>

			<section className="case-grid">
				{(
					[
						["SYSTEM", study.system, "FORM MEETS FUNCTION."],
						["INTERACTION", study.interaction, "MOTION WITH A JOB."],
						["INTENT", study.outcome, "A CLEAR POINT OF VIEW."],
					] as const
				).map(([label, copy, heading]) => (
					<article className="case-detail" key={label}>
						<b>{label}</b>
						<div>
							<h2>{heading}</h2>
							<p>{copy}</p>
						</div>
					</article>
				))}
			</section>

			<section className="case-prototype">
				<p className="mono">
					{study.type} / {study.index}
				</p>
				<h2>{study.tagline.toUpperCase()}</h2>
				{liveLinks[0] ? (
					<a
						className="case-launch mono"
						href={liveLinks[0].href}
						target="_blank"
						rel="noreferrer"
					>
						OPEN LIVE SITE ↗
					</a>
				) : caseHref ? null : (
					<span className="case-launch mono case-launch-muted">CONCEPT / DIRECTION</span>
				)}
			</section>
		</main>
	);
}
