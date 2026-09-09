# Карта продуктов I'm Trying To Design

Единственный Cloudflare-аккаунт: **Proton** (`c6768e43a40f0e876c28a2c8089d0edc`).

Общий реестр: `packages/shared/src/projects.ts`

## Экосистема (пробито 2026-09-09)

| # | Проект | Статус | Домен / ссылки | Описание |
| --- | --- | --- | --- | --- |
| 01 | **Brandcultura** | live | [brandcultura.com](https://brandcultura.com), [brandcultura.agency](https://brandcultura.agency) | Kultur des Wachstums / SHAPE YOUR SOUND — music & culture agency |
| 02 | **I/TD** | live | [imtryingtodesign.com](https://imtryingtodesign.com), [brandcultura.art](https://brandcultura.art) | Studio hub + portfolio index (seven sites, seven structures) |
| 03 | **Namenlos** | live | [namenlos.tattoo](https://www.namenlos.tattoo), [IG](https://instagram.com/namenlos_tattoo) | Tattoo — Viktoriia · custom / fine line / lettering · Nuremberg / Kyiv |
| 04 | **Cuebox** | live | [app.imtryingtodesign.com](https://app.imtryingtodesign.com), [cuebox-liart.vercel.app](https://cuebox-liart.vercel.app) | AI prompt library / MCP product |
| 05 | **Neon Stripe** | concept | — | Visual system: neon stripes / after-hours energy |
| 06 | **Club Stereo** | concept | [brandcultura.art/stereo](https://brandcultura.art/stereo) | Nightlife · Kyiv · single-frame poster |
| 07 | **Atelier SOL** | concept | [brandcultura.art/sol](https://brandcultura.art/sol) | Architecture · Kyiv · mass & light |
| 08 | **Vela** | concept | [brandcultura.art/vela](https://brandcultura.art/vela) | Fashion atelier · Paris / Kyiv |
| 09 | **Kava Noir** | concept | [brandcultura.art/kava](https://brandcultura.art/kava) | Hospitality · Kyiv · type-led menu |

Обложки: `apps/studio/public/projects/`

## Домены

| Host | Worker / host | App |
| --- | --- | --- |
| `imtryingtodesign.com` | `imtrtdweb` | I/TD ecosystem hub + `/admin` |
| `www.imtryingtodesign.com` | `imtrtdweb` | то же |
| `studio.imtryingtodesign.com` | `imtrtdweb` | то же |
| `app.imtryingtodesign.com` | Vercel | Cuebox |
| `brandcultura.com` | Vercel | Brandcultura DE |
| `brandcultura.agency` | Vercel | Brandcultura SHAPE YOUR SOUND |
| `brandcultura.art` | Vercel | I/TD portfolio index |
| `namenlos.tattoo` | Vercel | NAMENLOS Tattoo |

Fallback hub: `https://imtrtdweb.unitl.workers.dev`

## apps/studio

Публичный сайт — **ecosystem hub** (`ONE ECOSYSTEM. MANY PULSES.`).
Страницы: `/`, `/ecosystem`, `/work/:slug`, `/systems`, `/admin`.

## GitHub Actions

| Secret | Значение |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Proton, Workers Edit |
| `CLOUDFLARE_ACCOUNT_ID` | `c6768e43a40f0e876c28a2c8089d0edc` |
