# Карта продуктов

Единственный Cloudflare-аккаунт: **Proton** (`c6768e43a40f0e876c28a2c8089d0edc`).

## Домены

| Host | Worker / хостинг | App |
| --- | --- | --- |
| `imtrtd.space` | `imtrtd-hq` | `apps/hq` — публичный сайт студии |
| `www.imtrtd.space` | `imtrtd-hq` | то же (www → apex 301 делает edge Cloudflare) |
| `admin.imtrtd.space` | `imtrtdweb` | `apps/studio` — CMS (`/api/content`), заявки (`/api/leads`), кабинет `/admin` |
| `imtryingtodesign.com` | `imtryingtodesign` | `apps/portfolio` |
| `www.imtryingtodesign.com` | `imtryingtodesign` | то же |
| `app.imtryingtodesign.com` | Vercel | `apps/cuebox` |
| `namenlos-tg-bot.unitl.workers.dev` | `namenlos-tg-bot` | `apps/tg-bot` |

Маршруты — в `routes` каждого `wrangler.jsonc`.

## Как связаны hq и studio

- imtrtd.space — статика без сборки; тексты и кейсы браузер дотягивает из `https://admin.imtrtd.space/api/content`.
- Форма брифа на imtrtd.space → `POST https://admin.imtrtd.space/api/leads` (CORS разрешён для `https://imtrtd.space`).
- Turnstile на форме выключен, пока на studio не заданы `TURNSTILE_SITE_KEY` (var) и `TURNSTILE_SECRET_KEY` (secret) — см. README.

## Деплой

Только GitHub Actions по мерджу в `main`: `deploy-hq.yml` (`apps/hq/**`), `deploy.yml` (`apps/studio/**`), `deploy-portfolio.yml`, `deploy-tg-bot.yml`. Правило `?v=` / immutable-кэша для `apps/hq` — в README.

## GitHub Actions

| Secret | Значение |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Proton, Workers Edit |
| `CLOUDFLARE_ACCOUNT_ID` | `c6768e43a40f0e876c28a2c8089d0edc` |

## Архив

`imtrtd/imtrtd-site-preview` — заархивированный репозиторий; в деплое не участвует, не изменяется.
