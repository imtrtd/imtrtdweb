import { BriefLab } from "../components/samples/BriefLab";

const apps = [
	["NAMENLOS", "Tattoo studio"],
	["NACHTWERK", "Event series"],
	["KIOSK 23", "Local commerce"],
];

export function SamplesPage() {
	return (
		<main className="samples-page">
			<header className="topbar">
				<a className="brand" href="/" aria-label="ImTryingToDesign home">
					<span className="brand-mark">I/TD</span>
					<span>
						IMTRYINGTO
						<br />
						DESIGN.COM
					</span>
				</a>
				<div className="status">
					<i /> SAMPLES
				</div>
				<nav className="nav" aria-label="Main navigation">
					<a href="/">HOME</a>
					<a href="/#work">WORK</a>
					<a href="/systems">SYSTEMS</a>
					<a href="/#brief">CONTACT</a>
				</nav>
			</header>
			<div className="samples-intro">
				<p className="eyebrow">// SAMPLES</p>
				<h1>Templates, then the brief.</h1>
				<p>
					Five starting systems. The visualizer under them builds the sample a client is
					actually asking for.
				</p>
			</div>
			<div className="samples-wrap">
				<BriefLab />
			</div>
			<div className="samples-apps">
				<p className="eyebrow">// CASES</p>
				{apps.map(([title, field]) => (
					<a key={title} href="/#work">
						<span>{field}</span>
						<strong>{title}</strong>
					</a>
				))}
			</div>
		</main>
	);
}
