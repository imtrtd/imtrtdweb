import type { APIRoute } from "astro";
import { cases } from "../data/cases";
import { site } from "../data/site";

// lastmod = build date: the site is rebuilt on every change (and daily), so it is accurate enough.
const today = new Date().toISOString().slice(0, 10);
const pages: [string, string][] = [
  ["/", "1.0"],
  ["/selected", "0.8"],
  ["/contact", "0.7"],
  ["/archive", "0.6"],
  ["/practice", "0.6"],
  ...cases.map((c): [string, string] => [`/work/${c.slug}`, "0.6"]),
];

export const GET: APIRoute = () =>
  new Response(
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
      pages.map(([p, pr]) => `<url><loc>${site.url}${p}</loc><lastmod>${today}</lastmod><priority>${pr}</priority></url>`).join("") +
      `</urlset>\n`,
    { headers: { "Content-Type": "application/xml; charset=utf-8" } },
  );
