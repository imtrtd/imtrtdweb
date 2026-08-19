# ImTryingToDesign — transfer guide

This archive contains the complete source code for the website, including the
responsive mobile layout and the `prefers-reduced-motion` accessibility mode.

## Requirements

- Node.js 22.13 or newer
- npm

## Local development

```bash
npm install
npm run dev
```

Open the local address printed in the terminal.

## Deploy to Cloudflare Workers

```bash
npm install
npx wrangler login
npm run deploy
```

Do not upload the ZIP through Cloudflare's drag-and-drop uploader. This is a
Vinext/React project with a build step and must be deployed with Wrangler or
connected to a Git repository through Workers Builds.

The first deployment creates a `*.workers.dev` address. In Cloudflare, open the
created Worker, choose **Settings → Domains & Routes → Add → Custom Domain**,
then enter `imtryingtodesign.com`. If the domain already uses Cloudflare DNS,
the necessary DNS record and certificate are configured automatically.

## Connecting imtryingtodesign.com

If the domain is registered elsewhere, first add it to the same Cloudflare
account and change its nameservers at the registrar. Add both
`imtryingtodesign.com` and `www.imtryingtodesign.com`, then choose one version
as the canonical redirect.

## Main editable files

- `app/page.tsx` — content, sections and interactions
- `app/globals.css` — visual system, animations, responsive breakpoints and
  reduced-motion rules
- `app/layout.tsx` — title and search metadata
- `public/` — favicon and static assets

## Before launch

Replace `hello@imtryingtodesign.com` in `app/page.tsx` if another contact
address is required. Review portfolio copy and project names, then test the
site on a real phone before switching DNS.
