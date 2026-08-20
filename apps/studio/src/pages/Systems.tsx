const systems = [
	{
		code: "SYS/01",
		name: "Signal Brutalism",
		className: "brutal",
		description:
			"A loud, conversion-focused system built with oversized type, hard edges, and a single disruptive accent.",
		tags: ["TYPE FIRST", "HIGH CONTRAST", "UTILITY"],
	},
	{
		code: "SYS/02",
		name: "Soft Editorial",
		className: "editorial",
		description:
			"A calm, story-led system for projects that need hierarchy, texture, and generous reading space.",
		tags: ["SERIF MIX", "SPATIAL", "NARRATIVE"],
	},
	{
		code: "SYS/03",
		name: "After Hours",
		className: "night",
		description:
			"An atmospheric event system combining sharp information architecture with a cinematic, nocturnal field.",
		tags: ["LIVE STATUS", "MOTION", "TICKET FLOW"],
	},
];

export function SystemsPage() {
	return (
		<main className="systems-page">
			<nav className="systems-nav">
				<a className="case-back" href="/">
					← HOME
				</a>
				<span className="mono">REFERENCE SYSTEMS / 2026</span>
			</nav>
			<section className="systems-intro">
				<p className="mono">// REUSABLE DESIGN DIRECTIONS</p>
				<h1>NOT TEMPLATES. STARTING POINTS.</h1>
				<span>
					These are original, internal reference systems: a way to discuss mood,
					hierarchy, interaction, and delivery with clarity before a client project
					begins.
				</span>
			</section>
			<section className="system-grid">
				{systems.map((system) => (
					<article className="system-card" key={system.code}>
						<div className="system-card-header">
							<span>{system.code}</span>
							<span>REFERENCE</span>
						</div>
						<div className={`system-swatch ${system.className}`}>
							<strong>{system.name}</strong>
						</div>
						<h2>{system.name}</h2>
						<p>{system.description}</p>
						<div className="system-tags">
							{system.tags.map((tag) => (
								<span key={tag}>{tag}</span>
							))}
						</div>
					</article>
				))}
			</section>
		</main>
	);
}
