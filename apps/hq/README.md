# apps/hq

Static studio site for **imtrtd.space** (merged ImTryingToDesign site). It is served by the assets-only Worker `imtrtd-hq`, with custom domains `imtrtd.space` and `www.imtrtd.space`.

- `public/`: the built site (plain HTML/CSS/JS, plus embedded demo builds under `public/sites/`).
- Deploy: push to `main` touching `apps/hq/**`, or run the "Deploy HQ to Cloudflare" workflow manually.
- Local preview: `npx wrangler@4.88.0 dev` from this folder, or any static server on `public/`.
