# imtryingtodesign.com

Portfolio site for ImTryingToDesign, an independent web design and development practice focused on expressive websites for small brands, artists, studios, cafes, and event-led projects.

The site is intentionally direct: the first screen presents the studio identity, selected concept work, design reference systems, services, and contact paths without a generic agency wrapper.

## What is inside

- A responsive one-page portfolio experience in `app/page.tsx`
- Three clearly labelled concept case-study pages under `app/work/[slug]`
- A reference systems page under `app/systems`
- A custom visual language in `app/globals.css`
- Cloudflare Workers deployment through Vinext and Vite

## Content policy

The portfolio case studies are placeholders and concept references. They are labelled as concept work in the interface so the site can show direction, taste, and delivery style without implying client ownership where none exists.

## Tech stack

- Next.js App Router
- React and TypeScript
- Vinext for Cloudflare Workers output
- Vite with the Cloudflare plugin
- Tailwind CSS v4 entry point with custom global styling

## Local development

Use Node.js `>=22.13.0`.

```bash
npm run install:ci
npm run dev
```

The local server is started by Vite/Vinext. Wrangler and Miniflare state are kept inside the project under `.wrangler/` so local tooling does not spill into the rest of the machine.

## Build and validation

```bash
npm run build
npm test
npm run validate:artifact
```

`npm run build` creates the deployable Worker artifact and validates that the output exposes the expected fetch handler.

## Project structure

```text
app/
  page.tsx              Main portfolio page
  globals.css           Site-wide visual system
  layout.tsx            Metadata and fonts
  work/[slug]/page.tsx  Concept case studies
  systems/page.tsx      Reference systems
worker/
  index.ts              Cloudflare Worker entry point
build/
  sites-vite-plugin.ts  Build-time artifact helper
scripts/
  *.sh                  Install, build, and validation helpers
```

## Deployment

Cloudflare Workers Builds run the project build from GitHub. The Vite config is self-contained and does not depend on private local hosting files.

## Security notes

- Do not commit `.env*`, Wrangler credentials, or local runtime state.
- Keep preview-only or workspace-only files out of production branches.
- Treat concept case text as public portfolio content.
