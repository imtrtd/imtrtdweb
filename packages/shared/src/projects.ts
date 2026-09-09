export type ProjectColor =
	| "acid"
	| "violet"
	| "orange"
	| "neon"
	| "cyan"
	| "ink"
	| "paper"
	| "ember"
	| "mint";

export type ProjectStatus = "live" | "beta" | "in_progress" | "concept";

export type ProjectLink = {
	label: string;
	href: string;
	external?: boolean;
};

export type EcosystemProject = {
	slug: string;
	index: string;
	title: string;
	type: string;
	color: ProjectColor;
	status: ProjectStatus;
	year: string;
	location: string;
	domain?: string;
	href: string;
	external?: boolean;
	image: string;
	note: string;
	tagline: string;
	description: string;
	accent: string;
	system: string;
	interaction: string;
	outcome: string;
	links: ProjectLink[];
};

export const ECOSYSTEM = {
	name: "I'm Trying To Design",
	tagline: "Digital experiences with a pulse.",
	email: "info@imtryingtodesign.com",
	hub: "imtryingtodesign.com",
	portfolio: "https://brandcultura.art",
} as const;

export const PROJECTS: EcosystemProject[] = [
	{
		slug: "brandcultura",
		index: "01",
		title: "BRANDCULTURA",
		type: "MUSIC / CULTURE AGENCY",
		color: "violet",
		status: "live",
		year: "2026",
		location: "DE · EN · Remote",
		domain: "brandcultura.com",
		href: "https://brandcultura.com",
		external: true,
		image: "/projects/brandcultura.jpg",
		note: "Culture-growth studio for music, art and emerging brands — spectrogram language, not a SaaS template.",
		tagline: "Kultur des Wachstums. Shape your sound.",
		description:
			"brandcultura is an independent agency that cultivates the cultural weight of ideas in sound, code, business and art. Live at brandcultura.com (Kultur des Wachstums) and brandcultura.agency (SHAPE YOUR SOUND) — identity, campaigns and community systems for artists and labels.",
		accent: "#8a5cff",
		system:
			"A modular identity kit with spectrogram-led motion, bilingual DE/EN voice, and a flexible grid from social to stage.",
		interaction:
			"Horizontal chapters, listening-room pacing and signal-to-wave storytelling — every touchpoint feels authored.",
		outcome:
			"The culture layer of the ecosystem: where visual DNA and audience growth are defined before they ship elsewhere.",
		links: [
			{ label: "brandcultura.com", href: "https://brandcultura.com", external: true },
			{
				label: "brandcultura.agency",
				href: "https://brandcultura.agency",
				external: true,
			},
			{
				label: "Case study",
				href: "/work/brandcultura",
			},
		],
	},
	{
		slug: "imtrtd",
		index: "02",
		title: "I/TD",
		type: "STUDIO / ECOSYSTEM HUB",
		color: "acid",
		status: "live",
		year: "2026",
		location: "Kyiv / Nuremberg / remote",
		domain: "imtryingtodesign.com",
		href: "/",
		image: "/projects/imtrtd.jpg",
		note: "Independent practice for identity, systems and the web — seven sites, seven structures.",
		tagline: "Websites with different bones.",
		description:
			"I'm Trying To Design is the connective hub: portfolio, lead capture, CMS and the shared design language across Brandcultura, Namenlos, Cuebox and the selected practice archive. Also indexed at brandcultura.art.",
		accent: "#d8ff26",
		system:
			"The hub you are on now — Cloudflare Workers, Durable Object storage, and a single registry for every project.",
		interaction:
			"Pulse-driven motion, glitch typography and sphere CTAs — expressive but always functional.",
		outcome:
			"One person, full system: from first sketch to deployment.",
		links: [
			{
				label: "imtryingtodesign.com",
				href: "https://imtryingtodesign.com",
				external: true,
			},
			{
				label: "brandcultura.art",
				href: "https://brandcultura.art",
				external: true,
			},
			{
				label: "Ecosystem map",
				href: "/ecosystem",
			},
		],
	},
	{
		slug: "namenlos",
		index: "03",
		title: "NAMENLOS",
		type: "TATTOO / UNDERGROUND",
		color: "orange",
		status: "live",
		year: "2026",
		location: "Nuremberg · Kyiv",
		domain: "namenlos.tattoo",
		href: "https://www.namenlos.tattoo",
		external: true,
		image: "/projects/namenlos-wide.jpg",
		note: "Public face of an underground studio. Xerox-brutalism, no name-as-brand, no polite grid.",
		tagline: "Custom. Fine line. Lettering. Use the pain as fuel.",
		description:
			"NAMENLOS — Viktoriia. Custom tattoo, fine line, lettering and raw graphic. Walk-ins when the lamp is on. Booking, designs, Lettering Lab and flash at namenlos.tattoo.",
		accent: "#ff4d19",
		system:
			"Xerox stack, artist-first gallery, flash catalog and a friction-light booking flow — no chrome, no Pinterest flash.",
		interaction:
			"Dense type paced by still moments, tactile hover states and deliberate route choices across /book, /designs and /labs.",
		outcome:
			"A live tattoo studio site where atmosphere and practical booking share the same stage.",
		links: [
			{
				label: "namenlos.tattoo",
				href: "https://www.namenlos.tattoo",
				external: true,
			},
			{
				label: "Book a session",
				href: "https://www.namenlos.tattoo/book",
				external: true,
			},
			{
				label: "Instagram",
				href: "https://instagram.com/namenlos_tattoo",
				external: true,
			},
			{ label: "Case study", href: "/work/namenlos" },
		],
	},
	{
		slug: "cuebox",
		index: "04",
		title: "CUEBOX",
		type: "PRODUCT / AI LIBRARY",
		color: "cyan",
		status: "live",
		year: "2026",
		location: "Remote",
		domain: "app.imtryingtodesign.com",
		href: "https://app.imtryingtodesign.com",
		external: true,
		image: "/projects/cuebox.jpg",
		note: "A quiet object and a quieter interface — one place for the next AI action, not another dashboard.",
		tagline: "Your box of cues for AI.",
		description:
			"Cuebox is a prompt library for individuals and small teams: prompts, tips, tasks, saved chats, reusable variables, variants, Explore catalog and ChatGPT MCP integration. Live at app.imtryingtodesign.com.",
		accent: "#00e5cc",
		system:
			"Collections, typed variables, prompt variants and an Explore catalog — local-first with optional cloud sync.",
		interaction:
			"Clean product UI with MCP tools for search, fetch and render — ship cues, not chrome.",
		outcome:
			"A shipped SaaS product: the practical side of the I/TD ecosystem.",
		links: [
			{
				label: "Open Cuebox",
				href: "https://app.imtryingtodesign.com",
				external: true,
			},
			{
				label: "Vercel deploy",
				href: "https://cuebox-liart.vercel.app",
				external: true,
			},
			{
				label: "GitHub",
				href: "https://github.com/imtrtd/cuebox",
				external: true,
			},
			{ label: "Case study", href: "/work/cuebox" },
		],
	},
	{
		slug: "neon-stripe",
		index: "05",
		title: "NEON STRIPE",
		type: "VISUAL SYSTEM / CREATIVE",
		color: "neon",
		status: "concept",
		year: "2026",
		location: "Concept",
		href: "/work/neon-stripe",
		image: "/projects/neon-stripe.jpg",
		note: "Electric stripe visual language — nocturnal gradients, chromatic energy and after-hours atmosphere.",
		tagline: "Electric stripes. After hours.",
		description:
			"Neon Stripe is a reusable visual kit inside the ecosystem: stripe motifs, glow treatments and a nocturnal color field that can dress events, products or campaigns. Domain TBD — direction lives in the hub for now.",
		accent: "#ff00aa",
		system:
			"A reusable visual kit: neon stripe patterns, glow treatments and a high-contrast nocturnal field.",
		interaction:
			"Stripe-driven motion, chromatic aberration and glow on dark surfaces.",
		outcome:
			"The atmospheric layer — a design direction ready to land on its own domain.",
		links: [{ label: "Case study", href: "/work/neon-stripe" }],
	},
	{
		slug: "club-stereo",
		index: "06",
		title: "CLUB STEREO",
		type: "NIGHTLIFE / KYIV",
		color: "ember",
		status: "concept",
		year: "2026",
		location: "Kyiv",
		href: "/work/club-stereo",
		image: "/projects/club-stereo.jpg",
		note: "A night that does not scroll. One frame, one lineup, one door.",
		tagline: "No photos after 01:00.",
		description:
			"CLUB STEREO is a single-frame nightlife poster system for Kyiv — open-air nights, basement-only sets and guest lineups. Structure is a night, not a feed.",
		accent: "#ff5a36",
		system:
			"One-frame poster architecture: date, doors, lineup — no infinite scroll, no stock nightlife chrome.",
		interaction:
			"Poster-first motion; information densifies only when the night needs it.",
		outcome:
			"A reference system for nightlife sites that refuse to look like ticket templates.",
		links: [
			{ label: "Case study", href: "/work/club-stereo" },
			{
				label: "In portfolio",
				href: "https://brandcultura.art/stereo",
				external: true,
			},
		],
	},
	{
		slug: "atelier-sol",
		index: "07",
		title: "ATELIER SOL",
		type: "ARCHITECTURE / KYIV",
		color: "paper",
		status: "concept",
		year: "2025",
		location: "Kyiv",
		href: "/work/atelier-sol",
		image: "/projects/atelier-sol.jpg",
		note: "A practice of mass and light. Chapters instead of a portfolio grid.",
		tagline: "Rooms of mass and light.",
		description:
			"Atelier SOL — architecture practice in Kyiv. Concrete, overcast light and measured oak. The website is a walk: image stays, text moves.",
		accent: "#c8bfa8",
		system:
			"Numbered chapters for mass, light, oak and silence — no project tiles, no hover zooms.",
		interaction:
			"Editorial pacing: still photography with walking copy.",
		outcome:
			"A quiet architecture site where structure is the work.",
		links: [
			{ label: "Case study", href: "/work/atelier-sol" },
			{
				label: "In portfolio",
				href: "https://brandcultura.art/sol",
				external: true,
			},
		],
	},
	{
		slug: "vela",
		index: "08",
		title: "VELA",
		type: "FASHION / ATELIER",
		color: "ink",
		status: "concept",
		year: "2025",
		location: "Paris · Kyiv",
		href: "/work/vela",
		image: "/projects/vela.jpg",
		note: "Cloth before copy. Appointments only.",
		tagline: "Atelier · lookbooks · AW25 / SS26.",
		description:
			"VELA is a fashion atelier presence spanning Paris and Kyiv — silk walls, table light, pavilion looks. Cloth leads; copy follows.",
		accent: "#e8dcc8",
		system:
			"Lookbook-first layout with appointment CTA — no catalog grids, no discount banners.",
		interaction:
			"Slow image reveals and sparse type; the garment is the interface.",
		outcome:
			"A fashion site that behaves like an atelier, not a shop.",
		links: [
			{ label: "Case study", href: "/work/vela" },
			{
				label: "In portfolio",
				href: "https://brandcultura.art/vela",
				external: true,
			},
		],
	},
	{
		slug: "kava-noir",
		index: "09",
		title: "Kava Noir",
		type: "HOSPITALITY / KYIV",
		color: "mint",
		status: "concept",
		year: "2025",
		location: "Kyiv",
		href: "/work/kava-noir",
		image: "/projects/kava-noir.jpg",
		note: "A room for slow plates. The site is a menu set in type.",
		tagline: "Evenings. Fire. Ferment.",
		description:
			"Kava Noir — Kyiv hospitality concept. Sourdough, smoke, river fish, ash and fermented cream. A menu in type, not a reservation widget with stock photos.",
		accent: "#7dffb3",
		system:
			"Type-led menu architecture: courses as chapters, evenings as the only schedule.",
		interaction:
			"Quiet scroll, strong typography, almost no chrome.",
		outcome:
			"A hospitality site that tastes like the room it describes.",
		links: [
			{ label: "Case study", href: "/work/kava-noir" },
			{
				label: "In portfolio",
				href: "https://brandcultura.art/kava",
				external: true,
			},
		],
	},
];

export function getProject(slug: string): EcosystemProject | undefined {
	return PROJECTS.find((p) => p.slug === slug);
}

export const STATUS_LABELS: Record<ProjectStatus, string> = {
	live: "LIVE",
	beta: "BETA",
	in_progress: "IN PROGRESS",
	concept: "CONCEPT",
};
