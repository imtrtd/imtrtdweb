# I'm Trying To Design — monorepo

Публичный сайт студии — **imtrtd.space** (`apps/hq`). Всё крутится на Cloudflare Workers (аккаунт Proton), кроме Cuebox (Vercel).

| App | Путь | Worker | Домен |
| --- | --- | --- | --- |
| **HQ** (публичный сайт) | `apps/hq` | `imtrtd-hq` | `imtrtd.space`, `www.imtrtd.space` |
| **Studio** (CMS, заявки, кабинет) | `apps/studio` | `imtrtdweb` | `admin.imtrtd.space` |
| **Portfolio** | `apps/portfolio` | `imtryingtodesign` | `imtryingtodesign.com`, `www.imtryingtodesign.com` |
| **Telegram-бот** | `apps/tg-bot` | `namenlos-tg-bot` | `namenlos-tg-bot.unitl.workers.dev` |
| **Cuebox** | `apps/cuebox` | — (Vercel) | `app.imtryingtodesign.com` |
| **psy** | `apps/psihovika` | `psy` | `*.workers.dev` (GitHub Actions) |

## Деплой

Деплой — только через GitHub Actions по мерджу в `main` (у каждого приложения свой workflow, срабатывает по изменению своего каталога). Руками `wrangler deploy` прод не выкатываем.

| Workflow | Срабатывает на | Что деплоит |
| --- | --- | --- |
| `.github/workflows/deploy-hq.yml` | `apps/hq/**` | `imtrtd-hq` (статичный сайт imtrtd.space) |
| `.github/workflows/deploy.yml` | `apps/studio/**` | `imtrtdweb` (admin.imtrtd.space, API, CMS) |
| `.github/workflows/deploy-portfolio.yml` | `apps/portfolio/**` | `imtryingtodesign` |
| `.github/workflows/deploy-tg-bot.yml` | `apps/tg-bot/**` | `namenlos-tg-bot` |
| `.github/workflows/deploy-psihovika.yml` | `apps/psihovika/**` | `psy` |

У всех есть `workflow_dispatch` (ручной запуск из Actions). Cuebox деплоится отдельно (Vercel); psy — через `deploy-psihovika.yml`.

## apps/hq — imtrtd.space

Сайт собирается из исходников (Astro 7, статичная сборка) — подробности в `apps/hq/README.md`.

- Исходники: `src/pages` (страницы), `src/components`, `src/data` (кейсы, услуги, пакеты, FAQ — **тексты правятся здесь**), `src/scripts` (эффекты, форма брифа), `src/styles`.
- `public/` — то, что копируется как есть: шрифты, картинки, `_headers`, демо-сборки кейсов `public/sites/<slug>/`.
- Сборка: `cd apps/hq && npm ci && npm run build` → `dist/` (+ проверка битых ссылок `scripts/check-dist.mjs`).
- Worker `worker/index.js`: http→https, `*.html` → 301 на чистые URL, security-заголовки (CSP, HSTS…), остальное — Static Assets из `dist/`. Неизвестный путь → `dist/404.html` со статусом 404.
- CMS (`https://admin.imtrtd.space/api/content`) применяется **при сборке** (`src/lib/cms.ts`), только если в админке `hq_cms = on`; иначе — локальные данные. Деплой пересобирает сайт ежедневно, чтобы правки из админки доезжали без коммита.
- Бриф (4 шага) шлёт `POST https://admin.imtrtd.space/api/leads` (studio), оттуда уходят уведомления в Telegram и на почту.
- Локально: `npm run dev` (Astro, http://localhost:4321) или `npm run preview` (сборка + `wrangler dev`; worker редиректит http→https — передавайте заголовок `x-forwarded-proto: https`).

### Кэш

Из `apps/hq/public/_headers`:

- `/assets/*` (CSS/JS сборки, имя содержит хэш) и `/fonts/*` — `max-age=31536000, immutable`. Ручные `?v=` больше не нужны: изменился файл — изменилось имя.
- `/images/*`, `/brand/*`, `/og.png`, favicon — неделя.
- HTML — без кэша (`max-age=0`).

## apps/studio — admin.imtrtd.space

- API для сайта: `GET /api/content` (CMS), `GET /api/leads` (конфиг формы: `{"turnstile": null}` пока проверка выключена), `POST /api/leads` (заявка).
- Хранение — Durable Object SQLite (`AppStore`).
- Rate limit заявок: binding `LEAD_RATE_LIMITER` (Workers Rate Limiting, 5 POST в минуту на IP), фолбэк — in-memory.
- Проверки: `npm --prefix apps/studio test`, `npx tsc -b`, `npx eslint .` в `apps/studio`.

### Turnstile на форме (PSE-22)

Сейчас выключен. Включается, только когда на studio-воркере заданы **оба** значения:

1. `TURNSTILE_SITE_KEY` — публичный ключ виджета, обычная переменная в `apps/studio/wrangler.jsonc` → `vars` (сейчас `""`);
2. `TURNSTILE_SECRET_KEY` — секрет (`wrangler secret put TURNSTILE_SECRET_KEY`); ключи выдаёт владелец аккаунта.

После этого hq получает ключ из `GET /api/leads` и сам рисует виджет. Подробности (fail-open, `TURNSTILE_REQUIRE_ALL`) — в `apps/studio/worker/lib/turnstile.ts`.

## Команды

```bash
npm --prefix apps/studio ci
npm run dev:studio
npm run test:studio

npm --prefix apps/psihovika ci
npm run dev:psihovika
npm run build:psihovika
```

## Структура

```text
apps/
  hq/           # imtrtd.space — статичный сайт студии (Worker imtrtd-hq)
  studio/       # admin.imtrtd.space — CMS, API заявок, кабинет /admin
  portfolio/    # imtryingtodesign.com — портфолио Next/Vinext
  tg-bot/       # namenlos-tg-bot
  cuebox/       # prompt library (Vercel)
  psihovika/    # psy — каталог психологических методик (Cloudflare Workers)
docs/
  PROJECTS.md   # карта доменов и воркеров
packages/
  shared/       # общие типы
```

## История

Раньше код жил в отдельных репозиториях (`imtrtdweb`, `www.imtryingtodesign.com`, `cuebox`). Репозиторий `imtrtd/imtrtd-site-preview` заархивирован; актуальный сайт — `apps/hq` здесь.
