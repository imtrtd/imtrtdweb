# HQ

The studio website is built with Astro and includes project stories, services, and a contact brief.

## Local development

```bash
npm ci
npm run dev
```

The development server is available at `http://localhost:4321`.

To build and check the production site:

```bash
npm run build
npm run check
```

## Updating content

- Add or edit project stories in `src/data/cases.ts`.
- Update services, packages, FAQs, and testimonials in `src/data/offer.ts`.
- Shared site details and navigation live in `src/data/site.ts`.
- Page components are in `src/pages` and reusable UI is in `src/components`.

See the source tree for the full list of pages, components, and static assets.
