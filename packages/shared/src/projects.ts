export type ProjectColor = "acid" | "violet" | "orange" | "neon" | "cyan";
export type ProjectStatus = "live" | "beta" | "in_progress" | "concept";

export type EcosystemProject = {
	slug: string;
	index: string;
	title: string;
	type: string;
	color: ProjectColor;
	status: ProjectStatus;
	domain?: string;
	href: string;
	external?: boolean;
	note: string;
	tagline: string;
	accent: string;
	system: string;
	interaction: string;
	outcome: string;
};

export const ECOSYSTEM = {
	name: "I'm Trying To Design",
	tagline: "Digital experiences with a pulse.",
	email: "info@imtryingtodesign.com",
	hub: "imtryingtodesign.com",
} as const;

export const PROJECTS: EcosystemProject[] = [
	{
		slug: "brandcultura",
		index: "01",
		title: "BRANDCULTURA",
		type: "BRAND STUDIO / CULTURE",
		color: "violet",
		status: "in_progress",
		domain: "brandcultura.com",
		href: "/work/brandcultura",
		note: "Brand culture lab — identity systems, cultural positioning and visual language for studios that want to mean something.",
		tagline: "Culture-first brand systems.",
		accent: "#8a5cff",
		system:
			"A modular identity kit: typography, motion tokens, and a flexible grid that scales from social to storefront.",
		interaction:
			"Editorial pacing with bold type moments — every touchpoint feels authored, never templated.",
		outcome:
			"The foundation layer of the ecosystem: where visual DNA is defined before it ships anywhere else.",
	},
	{
		slug: "imtrtd",
		index: "02",
		title: "I/TD",
		type: "STUDIO / PORTFOLIO",
		color: "acid",
		status: "live",
		domain: "imtryingtodesign.com",
		href: "/",
		note: "Independent web development — design, code and motion as one continuous product system.",
		tagline: "Design × development × visualization.",
		accent: "#d8ff26",
		system:
			"The hub you are on now: portfolio, lead capture, CMS and the connective tissue between every project.",
		interaction:
			"Pulse-driven motion, glitch typography and sphere CTAs — expressive but always functional.",
		outcome:
			"One person, full system: from first sketch to deployment on Cloudflare Workers.",
	},
	{
		slug: "namenlos",
		index: "03",
		title: "NAMENLOS",
		type: "TATTOO STUDIO / BOOKING",
		color: "orange",
		status: "in_progress",
		domain: "namenlos.tattoo",
		href: "/work/namenlos",
		note: "Identity-led booking flow for a tattoo studio — raw visual language, calm conversion path.",
		tagline: "Raw identity. Clear booking.",
		accent: "#ff4d19",
		system:
			"High-contrast navigation, artist-first gallery, and a friction-light request flow.",
		interaction:
			"Dense type paced by still moments, tactile hover states, and deliberate route choices.",
		outcome:
			"A tattoo studio site where atmosphere and practical booking share the same stage.",
	},
	{
		slug: "cuebox",
		index: "04",
		title: "CUEBOX",
		type: "AI WORKING LIBRARY / PRODUCT",
		color: "cyan",
		status: "live",
		domain: "app.imtryingtodesign.com",
		href: "https://app.imtryingtodesign.com",
		external: true,
		note: "Personal library of prompts, chats and AI working material — organize, reuse and sync.",
		tagline: "Your box of cues for AI.",
		accent: "#00e5cc",
		system:
			"Collections, variables, variants and an Explore catalog — lightweight but structured.",
		interaction:
			"Clean product UI with MCP integration for ChatGPT — search, fetch, render prompts.",
		outcome:
			"A shipped SaaS product: the practical side of the I/TD ecosystem.",
	},
	{
		slug: "neon-stripe",
		index: "05",
		title: "NEON STRIPE",
		type: "VISUAL SYSTEM / CREATIVE",
		color: "neon",
		status: "concept",
		href: "/work/neon-stripe",
		note: "Neon stripe visual language — electric gradients, stripe motifs and after-hours energy.",
		tagline: "Electric stripes. After hours.",
		accent: "#ff00aa",
		system:
			"A reusable visual kit: neon stripe patterns, glow treatments and a nocturnal color field.",
		interaction:
			"Stripe-driven motion, chromatic aberration and high-contrast glow on dark surfaces.",
		outcome:
			"The atmospheric layer — a design direction that can dress events, products or campaigns.",
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
