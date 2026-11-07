/**
 * Build-time content from the admin CMS (admin.imtrtd.space/api/content).
 *
 * Before the rebuild the browser fetched this on every page view and patched the DOM, which
 * delayed LCP. Now the build fetches it once; the page ships final HTML. Same opt-in as before:
 * nothing is applied unless the admin copy key `hq_cms` is "on". Any failure (offline build,
 * timeout, bad JSON) falls back to the local data in src/data/* — the build never breaks on it.
 */
import { site } from "../data/site";
import { cases as localCases, type Case } from "../data/cases";
import { services as localServices } from "../data/offer";

type CmsCase = { title?: string; role?: string; result?: string; image_url?: string };
type CmsService = { title?: string; description?: string };
type CmsContent = { copy?: Record<string, string>; cases?: CmsCase[]; services?: CmsService[] };

let cached: Promise<CmsContent | null> | null = null;

async function fetchCms(): Promise<CmsContent | null> {
  if (import.meta.env.HQ_CMS === "off") return null;
  try {
    const res = await fetch(`${site.api}/api/content`, { signal: AbortSignal.timeout(6000) });
    if (!res.ok) return null;
    const data = (await res.json()) as CmsContent;
    if (data?.copy?.hq_cms !== "on") return null;
    return data;
  } catch {
    return null;
  }
}

function cms() {
  cached ??= fetchCms().then((c) => {
    console.log(c ? "[cms] applying admin content (hq_cms = on)" : "[cms] using local content");
    return c;
  });
  return cached;
}

const slugFromLink = (u?: string) => String(u ?? "").match(/work\/([a-z0-9-]+)/i)?.[1];
const clean = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function getSite() {
  const c = await cms();
  const copy = c?.copy ?? {};
  const email = clean(copy.hq_contact_email || copy.contact_email, 120);
  const telegram = clean(copy.hq_contact_telegram || copy.contact_telegram, 40).replace(/^@/, "");
  return {
    ...site,
    heroLine: clean(copy.hq_hero_line, 200) || site.heroLine,
    // legacy pm.me value in the admin copy is ignored (same rule as the old client script)
    email: /^[^\s@]+@[^\s@]+$/.test(email) && !/@pm\.me$/i.test(email) ? email : site.email,
    telegram: /^[A-Za-z0-9_]{4,32}$/.test(telegram) ? telegram : site.telegram,
  };
}

/** Cases with CMS overrides matched by slug (title, kind, summary). Order and the rest stay local. */
export async function getCases(): Promise<Case[]> {
  const c = await cms();
  if (!c?.cases?.length) return localCases;
  const bySlug = new Map(c.cases.map((k) => [slugFromLink(k.image_url), k]));
  return localCases.map((k) => {
    const o = bySlug.get(k.slug);
    if (!o) return k;
    // the admin stores the role as "Kind · Place" (e.g. "Tattoo studio · Kyiv / Nürnberg"): split it, so the
    // card's "kind · place · year" line does not repeat the place
    const [kind, place] = clean(o.role, 80).split(/\s*·\s*/);
    return {
      ...k,
      title: clean(o.title, 60) || k.title,
      kind: kind || k.kind,
      place: place || k.place,
      summary: clean(o.result, 240) || k.summary,
    };
  });
}

export async function getServices() {
  const c = await cms();
  if (!c?.services?.length) return localServices;
  return localServices.map((s, i) => {
    const o = c.services?.[i];
    return o ? { ...s, title: clean(o.title, 60) || s.title, text: clean(o.description, 240) || s.text } : s;
  });
}
