import { ECOSYSTEM, PROJECTS, STATUS_LABELS } from "../data/projects";

export function EcosystemPage() {
	return (
		<main className="systems-page">
			<nav className="systems-nav">
				<a className="case-back" href="/">
					← HOME
				</a>
				<span className="mono">ECOSYSTEM MAP / 2026</span>
			</nav>

			<section className="systems-intro">
				<p className="mono">// ONE ECOSYSTEM</p>
				<h1>
					FIVE
					<br />
					PULSES.
				</h1>
				<span>
					{ECOSYSTEM.name} is the connective layer — a shared design language,
					deployment stack and product mindset that ties Brandcultura, Namenlos,
					Cuebox and Neon Stripe into one coherent whole.
				</span>
			</section>

			<section className="ecosystem-map">
				<div className="ecosystem-hub">
					<span className="mono">HUB</span>
					<strong>I/TD</strong>
					<p>imtryingtodesign.com</p>
				</div>
				<div className="ecosystem-spokes">
					{PROJECTS.filter((p) => p.slug !== "imtrtd").map((project) => (
						<a
							className={`ecosystem-node ${project.color}`}
							href={project.href}
							key={project.slug}
							{...(project.external
								? { target: "_blank", rel: "noreferrer" }
								: {})}
						>
							<span className="mono">{project.index}</span>
							<strong>{project.title}</strong>
							<em>{STATUS_LABELS[project.status]}</em>
							{project.domain ? (
								<p className="mono">{project.domain}</p>
							) : null}
						</a>
					))}
				</div>
			</section>

			<section className="ecosystem-list">
				{PROJECTS.map((project) => (
					<a
						className={`project ${project.color}`}
						href={project.href}
						key={project.slug}
						{...(project.external
							? { target: "_blank", rel: "noreferrer" }
							: {})}
					>
						<span className="project-number mono">/{project.index}</span>
						<div>
							<p className="mono">
								{project.type} · {STATUS_LABELS[project.status]}
							</p>
							<h3>{project.title}</h3>
						</div>
						<p className="project-note">{project.tagline}</p>
						<span className="project-arrow">{project.external ? "↗" : "→"}</span>
					</a>
				))}
			</section>
		</main>
	);
}
