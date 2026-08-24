import type { CSSProperties } from "react";
import { getProject } from "../data/projects";

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

	return (
		<main className="case-page" style={caseStyle}>
			<nav className="case-nav">
				<a className="case-back" href="/#work">
					BACK TO WORK
				</a>
				<span className="mono">
					{study.type} / {study.index}
				</span>
			</nav>
			<section className="case-hero">
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
					<p className="case-intro">{study.note}</p>
					<p className="case-note mono">{study.tagline.toUpperCase()}</p>
				</div>
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
				<p className="mono">VISUAL DIRECTION / {study.index}</p>
				<h2>A USEFUL IDEA, GIVEN A PULSE.</h2>
				{study.external ? (
					<a
						className="case-launch mono"
						href={study.href}
						target="_blank"
						rel="noreferrer"
					>
						OPEN LIVE PRODUCT ↗
					</a>
				) : null}
			</section>
		</main>
	);
}
