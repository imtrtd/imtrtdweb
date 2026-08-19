# Карта продуктов imtryingtodesign.com

## Домены

| Host | App | Worker / platform | Назначение |
| --- | --- | --- | --- |
| `imtryingtodesign.com` | studio **или** portfolio | `imtrtdweb` / `imtryingtodesign` | ⚠️ два деплоя на один домен — выбрать один canonical |
| `www.imtryingtodesign.com` | studio / portfolio | см. выше | зеркало apex |
| `app.imtryingtodesign.com` | cuebox | Vercel | библиотека промптов |
| `*.unitl.workers.dev` | studio | `imtrtdweb` | preview / fallback |

## apps/studio (canonical ops)

- Публичный лендинг (RU)
- `POST /api/leads` — заявки, Resend, rate limit
- `/admin` — CMS кейсов, услуг, текстов; inbox заявок
- Хранилище: D1 или Durable Object SQLite (`AppStore`)
- Worker: `imtrtdweb`

## apps/portfolio

- Портфолио (EN), concept case studies `/work/[slug]`, `/systems`
- Vinext → Cloudflare Worker `imtryingtodesign`
- Контакт: mailto (без backend заявок)

## apps/cuebox

- Prompt library, variables, collections, Explore
- Local-first + cloud sync (Postgres/Prisma)
- Auth.js, деплой на Vercel

## Legacy (архивировать после миграции)

| Репозиторий | Статус |
| --- | --- |
| `imtrtd/imtrtdweb` | → `apps/studio` |
| `imtrtd/www.imtryingtodesign.com` | → `apps/portfolio` |
| `imtrtd/cuebox` | → `apps/cuebox` |
| `imtrtd/cuebox1` | boilerplate, не использовать |

## Cloudflare Workers (Proton account)

| Worker | Действие |
| --- | --- |
| `imtrtdweb` | **prod studio** — оставить |
| `imtryingtodesign` | portfolio — оставить до слияния |
| `imtryingtodesign-worker` | stub — удалить |
| `imtryingtodesign-worker-production` | redirect proxy — влить в main worker |
| `imtryingtodesign-public` | дубликат — проверить и удалить |

## Секреты CI (GitHub Actions)

| Secret | Для |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | deploy studio |
| `CLOUDFLARE_ACCOUNT_ID` | Proton account |

Cuebox: секреты в Vercel (`DATABASE_URL`, `AUTH_SECRET`, …).
