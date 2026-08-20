# Карта продуктов imtryingtodesign.com

## Домены (Proton account — custom domain)

| Host | Worker | App |
| --- | --- | --- |
| `imtryingtodesign.com` | `imtrtdweb` | studio |
| `www.imtryingtodesign.com` | `imtrtdweb` | studio |
| `studio.imtryingtodesign.com` | `imtrtdweb` | studio |
| `site.imtryingtodesign.com` | `imtrtdweb` | studio |
| `go.imtryingtodesign.com` | `imtrtdweb` | studio |
| `app.imtryingtodesign.com` | Vercel | cuebox |

Fallback: `https://imtrtdweb.unitl.workers.dev` (Proton), `https://imtrtdweb.gw44ptx87t.workers.dev` (Apple + D1).

## Cloudflare accounts

| Account ID | Назначение | Config |
| --- | --- | --- |
| `b6f57d806…` Apple | CI, D1, R2, workers.dev | `wrangler.jsonc` |
| `c6768e43…` Proton | Custom domain zone | `wrangler.proton.jsonc` |

## apps/studio

- Лендинг (RU), `/admin`, `POST /api/leads`
- D1 + R2 on Apple; DO SQLite fallback on Proton
- `npm run deploy` / `npm run deploy:proton`

## apps/portfolio / apps/cuebox

- Portfolio: Next/Vinext worker `imtryingtodesign` (optional, not on apex)
- Cuebox: Vercel + Postgres

## GitHub Actions secrets

| Secret | Account |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Apple |
| `CLOUDFLARE_ACCOUNT_ID` | `b6f57d806c999f1a03efca808701883e` |
| `CLOUDFLARE_PROTON_API_TOKEN` | Proton (Workers Edit) |
| `CLOUDFLARE_PROTON_ACCOUNT_ID` | `c6768e43a40f0e876c28a2c8089d0edc` |
