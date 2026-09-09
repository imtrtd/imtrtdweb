import { ECOSYSTEM, PROJECTS, STATUS_LABELS } from "../data/projects";

export function EcosystemPage() {
	const liveCount = PROJECTS.filter((p) => p.status === "live").length;

	return (
		<main className="systems-page">
			<nav className="systems-nav">
				<a className="case-back" href="/">
					← HOME
				</a>
				<span className="mono">
					ECOSYSTEM MAP / {PROJECTS.length} PROJECTS / {liveCount} LIVE
				</span>
			</nav>

			<section className="systems-intro">
				<p className="mono">// ONE ECOSYSTEM</p>
				<h1>
					{String(PROJECTS.length).padStart(2, "0")}
					<br />
					PULSES.
				</h1>
				<span>
					{ECOSYSTEM.name} ties Brandcultura, Namenlos, Cuebox, Neon Stripe and the
					selected practice archive into one coherent whole — domains, descriptions
					and live links in one place.
				</span>
			</section>

			<section className="ecosystem-map">
				<div className="ecosystem-hub">
					<span className="mono">HUB</span>
					<strong>I/TD</strong>
					<p>imtryingtodesign.com</p>
					<a className="mono" href={ECOSYSTEM.portfolio} target="_blank" rel="noreferrer">
						brandcultura.art ↗
					</a>
				</div>
				<div className="ecosystem-spokes">
					{PROJECTS.filter((p) => p.slug !== "imtrtd").map((project) => (
						<a
							className={`ecosystem-node ${project.color}`}
							href={project.external ? `/work/${project.slug}` : project.href}
							key={project.slug}
						>
							<span className="mono">{project.index}</span>
							<strong>{project.title}</strong>
							<em>{STATUS_LABELS[project.status]}</em>
							{project.domain ? (
								<p className="mono">{project.domain}</p>
							) : (
								<p className="mono">{project.location}</p>
							)}
						</a>
					))}
				</div>
			</section>

			<section className="project-cards">
				{PROJECTS.map((project) => (
					<article className={`project-card ${project.color}`} key={project.slug}>
						<a
							className="project-card-media"
							href={project.external ? `/work/${project.slug}` : project.href}
						>
							<img src={project.image} alt="" loading="lazy" />
							<span className="mono">{STATUS_LABELS[project.status]}</span>
						</a>
						<div className="project-card-body">
							<p className="mono">
								/{project.index} · {project.type}
							</p>
							<h3>{project.title}</h3>
							<p>{project.description}</p>
							{project.domain ? (
								<p className="project-card-domain mono">{project.domain}</p>
							) : null}
							<div className="project-card-links">
								{project.links.slice(0, 3).map((link) => (
									<a
										key={link.href + link.label}
										href={link.href}
										{...(link.external
											? { target: "_blank", rel: "noreferrer" }
											: {})}
									>
										{link.label}
										{link.external ? " ↗" : ""}
									</a>
								))}
							</div>
						</div>
					</article>
				))}
			</section>
		</main>
	);
}
