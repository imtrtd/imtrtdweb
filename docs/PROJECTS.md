# Карта продуктов imtryingtodesign.com

Единственный Cloudflare-аккаунт: **Proton** (`c6768e43a40f0e876c28a2c8089d0edc`).

## Домены

| Host | Worker | App |
| --- | --- | --- |
| `imtryingtodesign.com` | `imtrtdweb` | I/TD portfolio + `/admin` |
| `www.imtryingtodesign.com` | `imtrtdweb` | то же |
| `studio.imtryingtodesign.com` | `imtrtdweb` | то же |
| `app.imtryingtodesign.com` | Vercel | Cuebox |

Fallback: `https://imtrtdweb.unitl.workers.dev`

## apps/studio

Публичный дизайн — I/TD portfolio (`DIGITAL EXPERIENCES WITH A PULSE`).
Кабинет: `/admin`. API заявок: `/api/*`. Хранение: Durable Object SQLite.

## GitHub Actions

| Secret | Значение |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Proton, Workers Edit |
| `CLOUDFLARE_ACCOUNT_ID` | `c6768e43a40f0e876c28a2c8089d0edc` |
