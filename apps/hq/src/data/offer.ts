/**
 * What is offered and how it runs: services, process, packages, FAQ, testimonials, changelog.
 *
 * Packages: `price` is null until you set it — the page then says "Quoted after the sample".
 * Set a string like "from €1,500" to show a price. Testimonials render only when the list
 * is non-empty: add real quotes with the client's permission.
 */

export const services = [
  {
    n: "01",
    title: "Web design",
    text: "Layouts, type and colour that work on every screen. Clickable prototypes.",
    deliverables: ["Phone-first layouts", "Type and colour system", "Clickable prototype"],
  },
  {
    n: "02",
    title: "Development",
    text: "Sites that load fast. Motion only where it helps.",
    deliverables: ["Static on the edge", "Forms, booking, CMS", "SEO and share previews"],
  },
  {
    n: "03",
    title: "Identity",
    text: "Marks and rules that survive a bad brief.",
    deliverables: ["Mark and wordmark", "Usage rules", "Social and print assets"],
  },
  {
    n: "04",
    title: "Care",
    text: "I stay on after launch: fixes, updates, new pages.",
    deliverables: ["Fixes and updates", "New pages and sections", "Same person as the build"],
  },
] as const;

export const process = [
  {
    k: "Brief",
    h: "Start from what exists",
    p: "I read the brand as it is: logo, type, colours, the copy already written. Then one question: what should a visitor do on the first screen?",
  },
  {
    k: "Sample",
    h: "One working screen, not a deck",
    p: "Before any scope, one real screen in the browser with real copy. If the direction is wrong, it costs a day, not a month.",
  },
  {
    k: "Build",
    h: "Shipped as code",
    p: "Design and build happen in the same hands, so nothing gets lost in a handoff.",
  },
  {
    k: "Run",
    h: "Kept alive after launch",
    p: "A site that stops on launch week isn’t finished. Fixes, updates and new pages stay with the same person.",
  },
] as const;

export type Package = {
  id: string;
  name: string;
  for: string;
  includes: string[];
  price: string | null;
  featured?: boolean;
  task: string;
};

export const packages: Package[] = [
  {
    id: "sample",
    name: "Sample",
    for: "See the direction before committing to a scope.",
    includes: ["One working screen in the browser", "Real copy and photos", "Desk and phone side by side"],
    price: null,
    task: "Sample",
  },
  {
    id: "site",
    name: "Site",
    for: "A studio, artist or small brand that needs to be found and booked.",
    includes: ["The pages your visitors need", "Booking or inquiry flow", "Languages your visitors read", "Launch on your domain"],
    price: null,
    featured: true,
    task: "Website",
  },
  {
    id: "system",
    name: "System",
    for: "A product or a brand that needs identity and interface as one.",
    includes: ["Identity and interface system", "Components with every state", "App or tool build"],
    price: null,
    task: "Interface",
  },
  {
    id: "care",
    name: "Care",
    for: "After launch: keep it fast, current and growing.",
    includes: ["Fixes and updates", "New pages and sections", "Same hands as the build"],
    price: null,
    task: "Care",
  },
];

export const faq = [
  {
    q: "Will you restyle my logo to match your look?",
    a: "No. A client’s logo, type and colours are never restyled to match this site. The work is built around the brand as it is.",
  },
  {
    q: "What do I need before we start?",
    a: "Nothing is required. Useful: the one thing a visitor should do, brand files, real copy even if rough, photos, languages and a date that matters.",
  },
  {
    q: "How fast will I see something?",
    a: "The first step is one working screen with real copy. If the direction is wrong, it costs a day, not a month.",
  },
  {
    q: "Which languages can the site speak?",
    a: "Whatever your visitors read. Shipped so far: English, Ukrainian, German and Russian, including Cyrillic-safe type.",
  },
  {
    q: "Who builds it after the design?",
    a: "The same person. Design and build happen in the same hands, so nothing gets lost in a handoff.",
  },
  {
    q: "What happens after launch?",
    a: "I stay on: fixes, updates and new pages, from the same person who built it.",
  },
] as const;

export const faqJsonLd = () => ({
  "@type": "FAQPage",
  mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export type Testimonial = { quote: string; name: string; role: string; case?: string };

/** Real quotes only, with permission. Empty = the section is not rendered. */
export const testimonials: Testimonial[] = [];

export const changelog = [
  {
    date: "07.11.26",
    title: "Rebuilt from source",
    text: "The site now builds from components: case studies, a brief in steps, packages and FAQ.",
  },
  { date: "Now", title: "Live builds", text: "Five projects open right here, each on its own page." },
  { date: "20.08.26", title: "Colour", text: "Violet by default. Lime, magenta and cyan on the switch." },
  { date: "13.08.26", title: "Identity", text: "The mark and type stay. No trend recolours." },
] as const;
