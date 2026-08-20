import { useEffect, useRef, useState } from "react";
import { PulseControl } from "../components/landing/PulseControl";

const projects = [
	{
		n: "01",
		title: "NAMENLOS",
		type: "TATTOO STUDIO / BOOKING",
		color: "acid",
		href: "/work/namenlos",
		note: "Concept case study: identity-led booking flow with a raw visual language.",
	},
	{
		n: "02",
		title: "NACHTWERK",
		type: "EVENT SERIES / TICKETS",
		color: "violet",
		href: "/work/nachtwerk",
		note: "Concept case study: an atmospheric event page built around line-ups and conversion.",
	},
	{
		n: "03",
		title: "KIOSK 23",
		type: "CAFÉ / LOCAL COMMERCE",
		color: "orange",
		href: "/work/kiosk-23",
		note: "Concept case study: a compact digital home for a small space with a loud point of view.",
	},
];

const releases = [
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
	{
		version: "v1.3.2",
		date: "31.07.26",
		title: "SYSTEM POLISH",
		items: ["reduced motion mode", "mobile navigation pass", "sharper type rhythm"],
	},
	{
		version: "v1.3.0",
		date: "18.07.26",
		title: "PROJECT ARCHIVE",
		items: ["case-study grid", "service modules", "bilingual structure"],
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
					<i /> AVAILABLE FOR Q4 <span>2026</span>
					<PulseControl />
				</div>
				<nav
					className={menuOpen ? "nav open" : "nav"}
					aria-label="Main navigation"
				>
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
					INDEPENDENT WEB DEVELOPMENT
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
					<span>DIGITAL</span>
					<span className="outline glitch" data-text="EXPERIENCES">
						EXPERIENCES
					</span>
					<span>WITH A PULSE.</span>
				</h1>
				<div className="hero-bottom">
					<p>
						I design and build expressive websites, interfaces and digital systems
						for independent studios, artists and small brands that refuse to look
						generic.
					</p>
					<a
						className="round-link sphere-atom"
						href="#work"
						aria-label="Explore selected work"
					>
						<SphereShell />
						<span>
							EXPLORE
							<br />
							WORK
						</span>
						<b>↓</b>
					</a>
				</div>
				<div className="scroll-code mono">SCROLL_TO_EXPLORE [000—100]</div>
			</section>

			<section className="manifesto section-pad">
				<p className="eyebrow">// WHAT I DO</p>
				<h2>
					ONE PERSON.
					<br />
					FULL <em>SYSTEM.</em>
				</h2>
				<div className="manifesto-copy">
					<p>
						From first sketch to deployment: strategy, interface, code and motion
						developed as one continuous product system.
					</p>
					<span className="mono">[ DESIGN × DEVELOPMENT × VISUALIZATION ]</span>
				</div>
			</section>

			<section className="projects" id="work">
				<div className="section-head section-pad">
					<p className="eyebrow">// SELECTED WORK</p>
					<span className="mono">03 CONCEPT CASES / 03 SYSTEMS</span>
				</div>
				{projects.map((project) => (
					<a
						className={`project ${project.color}`}
						href={project.href}
						key={project.title}
						aria-label={`Open ${project.title} concept case study`}
					>
						<span className="project-number mono">/{project.n}</span>
						<div>
							<p className="mono">{project.type}</p>
							<h3>{project.title}</h3>
						</div>
						<p className="project-note">{project.note}</p>
						<span className="project-arrow">↗</span>
					</a>
				))}
				<div className="work-archive section-pad">
					<p className="mono">
						ALL CASE STUDIES ARE CLEARLY LABELED CONCEPT / PLACEHOLDER WORK.
					</p>
					<a className="systems-link" href="/systems">
						OPEN THE REFERENCE SYSTEMS <span>↗</span>
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
							["01", "WEB DESIGN", "Visual systems, responsive interfaces and prototypes."],
							["02", "DEVELOPMENT", "Fast, accessible builds with clean interactions."],
							[
								"03",
								"VISUALIZATION",
								"Presentations, product concepts and visual systems from text.",
							],
							["04", "CARE & EVOLUTION", "Launch support, improvements and new releases."],
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
						The site evolves with the work. This log tracks the visible product and
						design changes.
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
