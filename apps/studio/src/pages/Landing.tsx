import { useEffect, useRef, useState } from "react";
import { PulseControl } from "../components/landing/PulseControl";
import { ECOSYSTEM, PROJECTS, STATUS_LABELS } from "../data/projects";

const releases = [
	{
		version: "v2.0.0",
		date: "24.08.26",
		title: "ECOSYSTEM HUB",
		items: [
			"unified project map for Brandcultura, I/TD, Namenlos, Cuebox and Neon Stripe",
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
	{
		version: "v1.4.0",
		date: "13.08.26",
		title: "IDENTITY UPDATE",
		items: [
			"purple identity system",
			"Space Grotesk typography",
			"cleaner mobile brand treatment",
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
						Brandcultura, Namenlos, Cuebox and Neon Stripe — unified under one
						design language, one deployment stack and one point of view: digital
						experiences that refuse to look generic.
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
					FIVE PROJECTS.
					<br />
					ONE <em>SYSTEM.</em>
				</h2>
				<div className="manifesto-copy">
					<p>
						From brand culture to tattoo booking, from AI tooling to neon visual
						systems — every project shares the same foundation: strategy,
						interface, code and motion developed as one continuous product.
					</p>
					<span className="mono">
						[ BRANDCULTURA × I/TD × NAMENLOS × CUEBOX × NEON STRIPE ]
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
				<div className="ecosystem-strip">
					{PROJECTS.map((project) => (
						<a
							className={`ecosystem-chip ${project.color}`}
							href={project.href}
							key={project.slug}
							{...(project.external
								? { target: "_blank", rel: "noreferrer" }
								: {})}
						>
							<span className="mono">{project.index}</span>
							<strong>{project.title}</strong>
							<em>{STATUS_LABELS[project.status]}</em>
						</a>
					))}
				</div>
				<div className="work-archive">
					<p className="mono">
						EVERY PROJECT HAS ITS OWN DOMAIN, VISUAL LANGUAGE AND PURPOSE — BUT
						THEY ALL RUN ON THE SAME DESIGN DNA.
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
				{PROJECTS.map((project) => (
					<a
						className={`project ${project.color}`}
						href={project.href}
						key={project.slug}
						aria-label={`Open ${project.title}`}
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
						<p className="project-note">{project.note}</p>
						<span className="project-arrow">{project.external ? "↗" : "→"}</span>
					</a>
				))}
				<div className="work-archive section-pad">
					<p className="mono">
						CUEBOX IS LIVE AT APP.IMTRYINGTODESIGN.COM — THE REST EVOLVES IN
						PUBLIC.
					</p>
					<a className="systems-link" href="/systems">
						OPEN REFERENCE SYSTEMS <span>↗</span>
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
