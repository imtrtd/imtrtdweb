# Карта продуктов imtryingtodesign.com

Единственный Cloudflare-аккаунт: **Proton** (`c6768e43a40f0e876c28a2c8089d0edc`).

## Экосистема

| # | Проект | Статус | Домен | App |
| --- | --- | --- | --- | --- |
| 01 | **Brandcultura** | in progress | brandcultura.com | studio `/work/brandcultura` |
| 02 | **I/TD** | live | imtryingtodesign.com | studio (хаб) |
| 03 | **Namenlos** | in progress | namenlos.tattoo | studio `/work/namenlos` |
| 04 | **Cuebox** | live | app.imtryingtodesign.com | `apps/cuebox` (Vercel) |
| 05 | **Neon Stripe** | concept | — | studio `/work/neon-stripe` |

Общий реестр проектов: `packages/shared/src/projects.ts`

## Домены

| Host | Worker | App |
| --- | --- | --- |
| `imtryingtodesign.com` | `imtrtdweb` | I/TD ecosystem hub + `/admin` |
| `www.imtryingtodesign.com` | `imtrtdweb` | то же |
| `studio.imtryingtodesign.com` | `imtrtdweb` | то же |
| `app.imtryingtodesign.com` | Vercel | Cuebox |

Fallback: `https://imtrtdweb.unitl.workers.dev`

## apps/studio

Публичный сайт — **ecosystem hub** (`ONE ECOSYSTEM. MANY PULSES.`).
Страницы: `/`, `/ecosystem`, `/work/:slug`, `/systems`, `/admin`.
API заявок: `/api/*`. Хранение: Durable Object SQLite.

## GitHub Actions

| Secret | Значение |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Proton, Workers Edit |
| `CLOUDFLARE_ACCOUNT_ID` | `c6768e43a40f0e876c28a2c8089d0edc` |
