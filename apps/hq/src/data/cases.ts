/**
 * Case studies. Everything here is taken from the live builds under public/sites/*
 * (their own copy and features) — no invented numbers. Add a case by appending an entry:
 * the home grid, /selected, /work/<slug>, the sitemap and the OG tags pick it up.
 */

export type Fact = { label: string; value: string };
export type Feature = { title: string; text: string };

export type Case = {
  slug: string;
  title: string;
  /** Short kicker, e.g. "Tattoo studio". */
  kind: string;
  place: string;
  year: number;
  /** One line for cards and meta descriptions. */
  summary: string;
  /** What the job was. */
  brief: string;
  /** What shipped, as scannable blocks. */
  features: Feature[];
  /** Hard facts for the side table. */
  facts: Fact[];
  scope: string[];
  stack: string[];
  /** A detail worth telling: a decision, a trade-off. */
  note?: { title: string; text: string };
  /** Live build shown in the case frame: a demo under /sites/<slug>/ or the product's own URL. */
  demo: string;
  /** The production site, when it lives elsewhere. */
  live?: { href: string; label: string };
  /** Preview images in /images/previews (<slug>-w / -n, webp + jpg). */
  preview: string;
};

export const cases: Case[] = [
  {
    slug: "namenlos",
    title: "NAMENLOS",
    kind: "Tattoo studio",
    place: "Nürnberg / Kyiv",
    year: 2026,
    summary: "Identity, website and booking for an underground tattoo studio built on punk and xerox-brutalism.",
    brief:
      "A self-taught, custom-only tattoo artist working between Nürnberg and Kyiv needed one place that shows real skin, takes bookings and announces guest spots — in the languages the clients actually speak. No polish, no catalogue look.",
    features: [
      { title: "Booking from the first screen", text: "“Book a session” and the current appointment status sit in the hero, not at the bottom of a contact page." },
      { title: "Designs catalogue", text: "Flash and finished work by style — trash polka, graphic, realism, neo tribal, aquarelle — real sessions, no filters." },
      { title: "Lettering Lab", text: "A separate space for script and lettering, the studio’s signature, instead of burying it in the gallery." },
      { title: "Events", text: "Guest-spot tour dates with venue and city, so clients in Berlin, Leipzig or Nürnberg know when the chair is near." },
    ],
    facts: [
      { label: "Languages", value: "EN · DE · RU · UA" },
      { label: "Sections", value: "Designs, Lettering Lab, Events, Booking" },
      { label: "Prices", value: "Shown up front" },
    ],
    scope: ["Identity", "Website", "Booking"],
    stack: ["React", "Vite", "Tailwind CSS"],
    note: {
      title: "The mark stays raw",
      text: "Xerox texture, hard contrast and punk type are the brand. The system was built around them instead of smoothing them into a template.",
    },
    demo: "/sites/namenlos/",
    live: { href: "https://namenlos.tattoo", label: "namenlos.tattoo" },
    preview: "namenlos",
  },
  {
    slug: "pulse-box",
    title: "PULSEBOX",
    kind: "Music app",
    place: "Browser",
    year: 2026,
    summary: "An 8-bit chiptune studio in the browser, built like a handheld. Four channels, sixteen steps.",
    brief:
      "A small instrument with one job: make a loop in the NES palette of sounds without installing anything. It had to feel like hardware and work with a thumb on a phone as well as with a keyboard.",
    features: [
      { title: "Four NES-style channels", text: "Lead and harmony pulse, triangle bass and a noise channel for drums — each with duty, level and mute." },
      { title: "Sixteen steps", text: "Pick a note or a drum, then tap or drag across the grid. Loop one bar or play all four as a song." },
      { title: "Songs included", text: "Night Market comes loaded, with Boss Door, River and a blank page to start from." },
      { title: "Yours stays yours", text: "Edits are kept on the device. Space plays. No account, no upload." },
    ],
    facts: [
      { label: "Channels", value: "Pulse ×2, triangle, noise" },
      { label: "Grid", value: "16 steps × 4 bars" },
      { label: "Sound", value: "Web Audio, synthesized live" },
    ],
    scope: ["Product", "Interface", "Sound"],
    stack: ["Vanilla JS", "Web Audio", "Canvas"],
    note: {
      title: "The pixel font went",
      text: "The later build speaks Russian. The pixel font had no Cyrillic, so it went, and the screw frame with it. Flat panel, same sound.",
    },
    demo: "/sites/pulse-box/",
    preview: "pulse-box",
  },
  {
    slug: "natvik",
    title: "Natvik Tours",
    kind: "Travel",
    place: "Dublin",
    year: 2026,
    summary: "Tours of Dublin, Ireland and Europe, written in Ukrainian for the people who take them.",
    brief:
      "A guide in Dublin runs walking tours, day trips across Ireland and group trips abroad. The audience reads Ukrainian, so the site does too, and every route needs a duration, a price and a short way to ask.",
    features: [
      { title: "Four directions", text: "Dublin, Ireland, trips abroad from Dublin, and group tours from other European cities — one level, no maze." },
      { title: "Routes that answer first", text: "Each card shows duration, place and a starting price before anyone has to ask." },
      { title: "Tour request", text: "A short request form instead of a booking engine: one step from a route to a conversation." },
      { title: "The guide, in person", text: "A founder section, because people book a person they trust, not a catalogue." },
    ],
    facts: [
      { label: "Language", value: "Ukrainian" },
      { label: "Routes", value: "Dublin, Howth, Glendalough, Switzerland…" },
      { label: "Pricing", value: "Starting price on every card" },
    ],
    scope: ["Website", "Content structure"],
    stack: ["React", "Vite", "Tailwind CSS"],
    demo: "/sites/natvik/",
    preview: "natvik",
  },
  {
    slug: "cuebox",
    title: "CUEBOX",
    kind: "Product",
    place: "Remote",
    year: 2026,
    summary: "A working library for prompts, chats and variables, shipped as a standalone product app.",
    brief:
      "Recurring AI work keeps getting re-typed. Cuebox saves a prompt once, fills it with variables and reuses it across chats, so the work stays consistent and the good versions don’t get lost in history.",
    features: [
      { title: "Prompts with variables", text: "Write a prompt once with placeholders, fill them in a form before every use." },
      { title: "Folders per AI service", text: "Collections organised by where the prompt is used, plus an explore catalogue to start from." },
      { title: "Import and export", text: "The library is the user’s: it moves in and out as files." },
      { title: "Works from other tools", text: "An MCP endpoint lets assistants read the library directly." },
    ],
    facts: [
      { label: "Type", value: "Web app with accounts" },
      { label: "Interface", value: "Russian" },
      { label: "Data", value: "Postgres" },
    ],
    scope: ["Product", "Interface system", "Build"],
    stack: ["Next.js", "Prisma", "Postgres", "Auth.js", "MCP"],
    demo: "/sites/cuebox/",
    live: { href: "https://app.imtryingtodesign.com", label: "app.imtryingtodesign.com" },
    preview: "cuebox",
  },
  {
    slug: "truesightpsy",
    title: "TrueSightPsy",
    kind: "Psychology",
    place: "Remote",
    year: 2026,
    summary: "A catalogue of 115 psychological methods in Russian, from three-minute check-ins to half-hour deep dives.",
    brief:
      "People looking for self-assessment land on copied, unsourced quizzes. The catalogue had to be honest about what each method is — public scales with their sources and official scoring, teaching profiles marked as such — and keep every answer in the visitor's own browser.",
    features: [
      { title: "Three depths for every method", text: "Касание, Разбор, Глубина: a short check-in, the full set, or the full set plus four questions about where the theme lives outside the form." },
      { title: "Sources in the open", text: "Public scales such as PHQ-9, GAD-7, PCL-5 and IPIP come with references and official scoring; teaching profiles are labelled as teaching profiles." },
      { title: "Private by default", text: "Answers, results and history stay in the browser. The cabinet keeps a summary, charts and a ready prompt for an AI conversation." },
      { title: "Filters people actually use", text: "By theme — defences, object relations, Jung, mood, anxiety, trauma — by school and by length, plus search by plain words like “shame” or “sleep”." },
    ],
    facts: [
      { label: "Methods", value: "115" },
      { label: "Language", value: "Russian" },
      { label: "Answers", value: "Stay in the browser" },
    ],
    scope: ["Product", "Interface", "Content system"],
    stack: ["TanStack Start", "React", "Cloudflare Workers", "Neon Postgres", "Better Auth"],
    note: {
      title: "What is not there",
      text: "No MMPI, Beck, MBTI or Lüscher forms: they cannot be published honestly. The first screen says so, instead of quietly faking them.",
    },
    demo: "https://psy.unitl.workers.dev/",
    preview: "truesightpsy",
  },
];

export const caseBySlug = (slug: string) => cases.find((c) => c.slug === slug);
