import { useEffect, useRef, useState } from "react";
import { PulseControl } from "../components/landing/PulseControl";
import { ECOSYSTEM, PROJECTS, STATUS_LABELS } from "../data/projects";

const releases = [
	{
		version: "v2.1.0",
		date: "09.09.26",
		title: "PROJECT INDEX",
		items: [
			"live domains, descriptions and covers for all known projects",
			"Brandcultura, Namenlos, Cuebox and I/TD linked to production URLs",
			"Club Stereo, Atelier SOL, Vela, Kava Noir and Neon Stripe in the archive",
		],
	},
	{
		version: "v2.0.0",
		date: "24.08.26",
		title: "ECOSYSTEM HUB",
		items: [
			"unified project map across the I/TD ecosystem",
			"ecosystem page with live status and cross-links",
			"case studies for every project in the portfolio",
		],
	},
	{
		version: "v1.5.0",
		date: "20.08.26",
		title: "PULSE ORB",
		items: [
			"lime pulse orb with FORM / ENERGY lockup",
			"planet and atom volume on circular CTAs",
			"live drum-and-bass pulse in the header",
		],
	},
];

export function LandingPage() {
	const [menuOpen, setMenuOpen] = useState(false);
	const [burst, setBurst] = useState(false);
	const glow = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
		const coarse = window.matchMedia("(pointer: coarse)");
		const move = (event: PointerEvent) => {
			if (!glow.current) return;
			glow.current.style.setProperty("--x", `${event.clientX}px`);
			glow.current.style.setProperty("--y", `${event.clientY}px`);
			document.documentElement.style.setProperty(
				"--px",
				String((event.clientX / window.innerWidth - 0.5) * 2),
			);
			document.documentElement.style.setProperty(
				"--py",
				String((event.clientY / window.innerHeight - 0.5) * 2),
			);
		};
		if (!coarse.matches && !reduce.matches) {
			window.addEventListener("pointermove", move, { passive: true });
		}
		return () => window.removeEventListener("pointermove", move);
	}, []);

	const celebrate = () => {
		setBurst(false);
		requestAnimationFrame(() => setBurst(true));
		window.setTimeout(() => setBurst(false), 1600);
	};

	const liveCount = PROJECTS.filter((p) => p.status === "live").length;

	return (
		<main>
			<div className="cursor-glow" ref={glow} aria-hidden="true" />
			<div className="noise" aria-hidden="true" />
			{burst ? <Confetti /> : null}

			<header className="topbar">
				<a className="brand" href="#top" aria-label="ImTryingToDesign home">
					<span className="brand-mark">I/TD</span>
					<span>
						IMTRYINGTO
						<br />
						DESIGN.COM
					</span>
				</a>
				<div className="status">
					<i /> {liveCount} LIVE · {PROJECTS.length} PROJECTS
					<PulseControl />
				</div>
				<nav
					className={menuOpen ? "nav open" : "nav"}
					aria-label="Main navigation"
				>
					<a href="#ecosystem" onClick={() => setMenuOpen(false)}>
						ECOSYSTEM
					</a>
					<a href="#work" onClick={() => setMenuOpen(false)}>
						WORK
					</a>
					<a href="#services" onClick={() => setMenuOpen(false)}>
						SERVICES
					</a>
					<a href="/systems" onClick={() => setMenuOpen(false)}>
						SYSTEMS
					</a>
					<a href="#changelog" onClick={() => setMenuOpen(false)}>
						CHANGELOG
					</a>
					<a href="mailto:info@imtryingtodesign.com">CONTACT ↗</a>
				</nav>
				<button
					className="menu"
					onClick={() => setMenuOpen((v) => !v)}
					aria-expanded={menuOpen}
					aria-label="Toggle menu"
				>
					{menuOpen ? "CLOSE" : "MENU"}
				</button>
			</header>

			<section className="hero" id="top">
				<div className="hero-meta mono">
					{ECOSYSTEM.name.toUpperCase()} ECOSYSTEM
					<br />
					KYIV / REMOTE / 50.4501° N
				</div>
				<div className="hero-rings" aria-hidden="true">
					<span />
					<span />
					<span />
				</div>
				<div className="orb" aria-hidden="true">
					<div className="orb-glow" />
					<span className="orb-label orb-label-top">FORM</span>
					<span className="orb-arrow">↗</span>
					<span className="orb-label orb-label-bottom">ENERGY</span>
				</div>
				<h1>
					<span>ONE</span>
					<span className="outline glitch" data-text="ECOSYSTEM">
						ECOSYSTEM
					</span>
					<span>MANY PULSES.</span>
				</h1>
				<div className="hero-bottom">
					<p>
						Brandcultura, Namenlos, Cuebox, Neon Stripe and the selected practice
						archive — domains, descriptions and covers under one design language.
					</p>
					<a
						className="round-link sphere-atom"
						href="#ecosystem"
						aria-label="Explore the ecosystem"
					>
						<SphereShell />
						<span>
							EXPLORE
							<br />
							ALL
						</span>
						<b>↓</b>
					</a>
				</div>
				<div className="scroll-code mono">SCROLL_TO_EXPLORE [000—100]</div>
			</section>

			<section className="manifesto section-pad">
				<p className="eyebrow">// THE HUB</p>
				<h2>
					{String(PROJECTS.length).padStart(2, "0")} PROJECTS.
					<br />
					ONE <em>SYSTEM.</em>
				</h2>
				<div className="manifesto-copy">
					<p>
						From culture agency to tattoo booking, from AI tooling to nightlife
						and hospitality — every project shares the same foundation: strategy,
						interface, code and motion as one continuous product.
					</p>
					<span className="mono">
						[ BRANDCULTURA × I/TD × NAMENLOS × CUEBOX × NEON STRIPE × STEREO × SOL
						× VELA × KAVA ]
					</span>
				</div>
			</section>

			<section className="ecosystem-preview section-pad" id="ecosystem">
				<div className="section-head ecosystem-head">
					<p className="eyebrow">// ECOSYSTEM</p>
					<span className="mono">
						{PROJECTS.length} PROJECTS / {liveCount} LIVE
					</span>
				</div>
				<div className="ecosystem-strip ecosystem-strip-scroll">
					{PROJECTS.map((project) => (
						<a
							className={`ecosystem-chip ${project.color}`}
							href={
								project.slug === "imtrtd" ? "/" : `/work/${project.slug}`
							}
							key={project.slug}
						>
							<span className="mono">{project.index}</span>
							<strong>{project.title}</strong>
							<em>
								{project.domain ?? STATUS_LABELS[project.status]}
							</em>
						</a>
					))}
				</div>
				<div className="work-archive">
					<p className="mono">
						LIVE DOMAINS: BRANDCULTURA.COM · NAMENLOS.TATTOO ·
						APP.IMTRYINGTODESIGN.COM · BRANDCULTURA.ART
					</p>
					<a className="systems-link" href="/ecosystem">
						OPEN ECOSYSTEM MAP <span>↗</span>
					</a>
				</div>
			</section>

			<section className="projects" id="work">
				<div className="section-head section-pad">
					<p className="eyebrow">// SELECTED WORK</p>
					<span className="mono">
						{String(PROJECTS.length).padStart(2, "0")} PROJECTS /{" "}
						{String(liveCount).padStart(2, "0")} LIVE
					</span>
				</div>
				<div className="project-gallery">
					{PROJECTS.map((project) => (
						<article className={`project-tile ${project.color}`} key={project.slug}>
							<a
								className="project-tile-media"
								href={
									project.slug === "imtrtd" ? "/" : `/work/${project.slug}`
								}
								aria-label={`Open ${project.title} case study`}
							>
								<img
									src={project.image}
									alt=""
									loading="lazy"
									width={700}
									height={440}
								/>
								<span className="project-tile-status mono">
									{STATUS_LABELS[project.status]}
								</span>
							</a>
							<div className="project-tile-body">
								<p className="mono">
									/{project.index} · {project.type}
								</p>
								<h3>{project.title}</h3>
								<p>{project.note}</p>
								{project.domain ? (
									<p className="project-tile-domain mono">{project.domain}</p>
								) : null}
								<div className="project-tile-links">
									{project.links.slice(0, 2).map((link) => (
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
				</div>
				<div className="work-archive section-pad">
					<p className="mono">
						FULL INDEX WITH COVERS AND LINKS ALSO LIVES AT BRANDCULTURA.ART —
						SEVEN SITES, SEVEN STRUCTURES.
					</p>
					<a
						className="systems-link"
						href="https://brandcultura.art"
						target="_blank"
						rel="noreferrer"
					>
						OPEN PORTFOLIO INDEX <span>↗</span>
					</a>
				</div>
			</section>

			<section className="services section-pad" id="services">
				<div>
					<p className="eyebrow">// CAPABILITIES</p>
					<h2>
						FROM IDEA
						<br />
						TO <span>ONLINE.</span>
					</h2>
				</div>
				<div className="service-list">
					{(
						[
							[
								"01",
								"WEB DESIGN",
								"Visual systems, responsive interfaces and prototypes.",
							],
							[
								"02",
								"DEVELOPMENT",
								"Fast, accessible builds with clean interactions.",
							],
							[
								"03",
								"PRODUCT",
								"SaaS tools like Cuebox — from concept to shipped product.",
							],
							[
								"04",
								"CARE & EVOLUTION",
								"Launch support, improvements and new releases.",
							],
						] as const
					).map(([n, title, desc]) => (
						<div className="service" key={n}>
							<b>{n}</b>
							<h3>{title}</h3>
							<p>{desc}</p>
						</div>
					))}
				</div>
			</section>

			<section className="changelog section-pad" id="changelog">
				<div className="terminal-title">
					<div>
						<i />
						<i />
						<i />
					</div>
					<span className="mono">~/imtryingtodesign/changelog.log</span>
					<span className="mono">LIVE</span>
				</div>
				<div className="change-intro">
					<p className="eyebrow">// BUILD IN PUBLIC</p>
					<h2>
						CHANGE
						<br />
						<span>LOG_</span>
					</h2>
					<p>
						The ecosystem evolves with the work. This log tracks visible product
						and design changes across all projects.
					</p>
				</div>
				<div className="release-list">
					{releases.map((release, index) => (
						<article className="release" key={release.version}>
							<div className="release-version">
								<span>{release.version}</span>
								<time>{release.date}</time>
							</div>
							<div>
								<h3>
									{release.title}
									{index === 0 ? <b>NEW</b> : null}
								</h3>
								{release.items.map((item) => (
									<p key={item}>
										<span>+</span> {item}
									</p>
								))}
							</div>
						</article>
					))}
				</div>
			</section>

			<footer className="footer section-pad" id="contact">
				<div className="footer-status mono">
					<i /> ACCEPTING SELECT PROJECTS / Q4 2026
				</div>
				<p className="eyebrow">// HAVE A PROJECT?</p>
				<h2>
					LET&apos;S MAKE
					<br />
					<span>SOMETHING</span>
					<br />
					UNMISSABLE.
				</h2>
				<a
					className="contact-button sphere-planet"
					href="mailto:info@imtryingtodesign.com"
					onClick={celebrate}
				>
					<SphereShell count={3} ring />
					<span className="contact-copy">
						START A PROJECT <b>↗</b>
					</span>
				</a>
				<div className="footer-ecosystem mono">
					{PROJECTS.map((project) => (
						<a
							href={project.href}
							key={project.slug}
							{...(project.external
								? { target: "_blank", rel: "noreferrer" }
								: {})}
						>
							{project.title} {project.external ? "↗" : ""}
						</a>
					))}
				</div>
				<div className="footer-row mono">
					<span>© 2026 IMTRYINGTODESIGN</span>
					<span>KYIV / REMOTE</span>
					<span>
						<a href="https://t.me/IMTRTD" target="_blank" rel="noreferrer">
							TELEGRAM ↗
						</a>{" "}
						·{" "}
						<a
							href="https://www.instagram.com/imtryingtodesign/"
							target="_blank"
							rel="noreferrer"
						>
							INSTAGRAM ↗
						</a>
					</span>
					<a href="#top">BACK TO TOP ↑</a>
				</div>
			</footer>
		</main>
	);
}

function SphereShell({ count = 3, ring = false }: { count?: number; ring?: boolean }) {
	return (
		<>
			<span className="sphere-body" aria-hidden="true" />
			<span className="sphere-orbits" aria-hidden="true">
				{ring ? <em className="sphere-ring" /> : null}
				{Array.from({ length: count }, (_, index) => (
					<i key={index} />
				))}
			</span>
		</>
	);
}

function Confetti() {
	return (
		<div className="confetti" aria-hidden="true">
			{Array.from({ length: 32 }).map((_, i) => (
				<i key={i} style={{ "--i": i } as React.CSSProperties} />
			))}
		</div>
	);
}
