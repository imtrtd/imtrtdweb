/**
 * Site-wide facts. Single source of truth for copy that repeats across pages.
 * The build may override a few of these from the admin CMS (see src/lib/cms.ts).
 */

export const site = {
  url: "https://imtrtd.space",
  name: "imtrtd",
  brand: "ImTryingToDesign",
  title: "IMTRTD — Web design & development, remote",
  description:
    "Websites, interfaces and systems for studios, artists and small brands. No templates. Web design & development — Kyiv / Remote.",
  heroLine: "Websites, interfaces and systems for studios, artists and small brands. No templates.",
  based: "Kyiv / Remote",
  timezone: "Europe/Kyiv",
  reply: "Within a working day",
  email: "admin@imtrtd.space",
  telegram: "imtrtd",
  instagram: "imtryingtodesign",
  threads: "imtryingtodesign",
  /** Languages the shipped sites speak so far (from the live builds). */
  languages: ["EN", "UA", "DE", "RU"],
  api: "https://admin.imtrtd.space",
} as const;

/**
 * Availability line. Computed at build time so it never goes stale:
 * "Booking <next month>" — the site is rebuilt at least daily (deploy-hq.yml schedule).
 */
export function availability(now = new Date()): { short: string; long: string } {
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  const month = next.toLocaleString("en-GB", { month: "long", timeZone: "UTC" });
  return {
    short: `Booking ${month}`,
    long: `Open for new projects · starts from ${month} ${next.getUTCFullYear()}`,
  };
}

export const nav = [
  { href: "/", label: "Home", fx: "home" },
  { href: "/selected", label: "Work", fx: "work" },
  { href: "/palette", label: "Palette", fx: "samples" },
  { href: "/practice", label: "Practice", fx: "practice" },
  { href: "/contact", label: "Contact", fx: "contact" },
] as const;

export const socials = [
  { id: "telegram", label: "Telegram", handle: "@imtrtd", href: "https://t.me/imtrtd", action: "Message" },
  {
    id: "instagram",
    label: "Instagram",
    handle: "@imtryingtodesign",
    href: "https://www.instagram.com/imtryingtodesign/",
    action: "Follow",
  },
  {
    id: "threads",
    label: "Threads",
    handle: "@imtryingtodesign",
    href: "https://www.threads.net/@imtryingtodesign",
    action: "Follow",
  },
] as const;
