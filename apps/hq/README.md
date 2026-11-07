# apps/hq — imtrtd.space

Astro 7 static build, served by the assets Worker `imtrtd-hq` (custom domains `imtrtd.space`, `www.imtrtd.space`).

```
src/
  pages/        index, selected, work/[slug], contact, palette, practice, 404, sitemap.xml
  components/   Header, Footer, Hero, CaseCard, BriefSteps, Packages, Process, Faq, SectionHead
  data/         site.ts (contacts, nav), cases.ts (case studies), offer.ts (services, packages, FAQ, testimonials, changelog)
  lib/cms.ts    build-time overrides from admin.imtrtd.space/api/content (only when hq_cms = "on")
  scripts/      fx.js (sound, accent, starfield, WebGL hero), site-api.js (lead POST + Turnstile), brief.js, …
  legacy/       Palette / Practice markup carried over from the pre-Astro site (driven by palette.js / practice.js)
public/         copied as is: fonts, images, brand, _headers, robots.txt, demo builds in sites/<slug>/
worker/index.js http→https, *.html → 301 clean URL, security headers, /sites/<x>/ SPA fallback
```

## Editing content

- **A new case**: add an entry to `src/data/cases.ts` and preview images `public/images/previews/<slug>-{n,w}.{jpg,webp}` (900 / 1520 px wide, 16:10), plus `public/images/og/<slug>.jpg` and the demo in `public/sites/<slug>/`. Home, /selected, /work/<slug>, footer and sitemap update themselves.
- **Prices**: `packages[].price` in `src/data/offer.ts` (`null` shows “Quoted after the sample”).
- **Testimonials**: `testimonials` in `src/data/offer.ts` — real quotes with permission; the section appears when the list is not empty.
- **Availability** (“Booking <month>”) is computed at build time; the workflow rebuilds daily.

## Commands

```bash
npm ci
npm run dev       # http://localhost:4321
npm run build     # dist/ + scripts/check-dist.mjs (missing pages, broken internal links)
npm run check     # astro check (types)
npm run preview   # build + wrangler dev (pass header x-forwarded-proto: https)
node scripts/serve.mjs   # dist/ with the Worker's URL rules, no wrangler
```

`HQ_CMS=off npm run build` skips the CMS request.

## Preview on a phone

- **Pull request preview (any network):** every PR touching `apps/hq` gets a comment with a stable link
  `https://pr-<number>-imtrtd-hq.<account>.workers.dev` (`.github/workflows/preview-hq.yml`). It is a Worker
  version that is uploaded but not deployed — production stays as is.
- **Same Wi-Fi as the computer:** `npm run phone` (build + `scripts/serve.mjs`) prints `http://<computer-ip>:4400`;
  open it in Safari. For live editing use `npm run dev:phone` → `http://<computer-ip>:4321` (hot reload).
  macOS may ask to allow incoming connections for `node` — allow it.
- **Outside the home network:** `npm run phone`, then in a second terminal
  `npx cloudflared tunnel --url http://localhost:4400` — it prints a temporary `https://….trycloudflare.com` link.
- The WebGL hero needs a real GPU: on a phone it renders at once; headless/CI browsers draw it in software, slowly.

Deploy: push to `main` touching `apps/hq/**`, the daily schedule, or “Deploy HQ to Cloudflare” → Run workflow.
Backup of the pre-Astro site: branch `backup/hq-2026-11-07`.
