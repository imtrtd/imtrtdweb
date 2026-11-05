# I'm Trying To Design — monorepo

Публичный сайт студии — **imtrtd.space** (`apps/hq`). Всё крутится на Cloudflare Workers (аккаунт Proton), кроме Cuebox.

| App | Путь | Worker | Домен |
| --- | --- | --- | --- |
| **HQ** (публичный сайт) | `apps/hq` | `imtrtd-hq` | `imtrtd.space`, `www.imtrtd.space` |
| **Studio** (CMS, заявки, кабинет) | `apps/studio` | `imtrtdweb` | `admin.imtrtd.space` |
| **Portfolio** | `apps/portfolio` | `imtryingtodesign` | `imtryingtodesign.com`, `www.imtryingtodesign.com` |
| **Telegram-бот** | `apps/tg-bot` | `namenlos-tg-bot` | `namenlos-tg-bot.unitl.workers.dev` |
| **Cuebox** | `apps/cuebox` | — (Vercel) | `app.imtryingtodesign.com` |

## Деплой

Деплой — только через GitHub Actions по мерджу в `main` (у каждого приложения свой workflow, срабатывает по изменению своего каталога). Руками `wrangler deploy` прод не выкатываем.

| Workflow | Срабатывает на | Что деплоит |
| --- | --- | --- |
| `.github/workflows/deploy-hq.yml` | `apps/hq/**` | `imtrtd-hq` (статичный сайт imtrtd.space) |
| `.github/workflows/deploy.yml` | `apps/studio/**` | `imtrtdweb` (admin.imtrtd.space, API, CMS) |
| `.github/workflows/deploy-portfolio.yml` | `apps/portfolio/**` | `imtryingtodesign` |
| `.github/workflows/deploy-tg-bot.yml` | `apps/tg-bot/**` | `namenlos-tg-bot` |

У всех есть `workflow_dispatch` (ручной запуск из Actions). Cuebox деплоится отдельно (Vercel).

## apps/hq — imtrtd.space

- Сборки нет: `apps/hq/public/` — готовые HTML/CSS/JS, демо-сборки кейсов лежат в `public/sites/<slug>/`.
- Worker `src/index.js`: http→https, `*.html` → 301 на чистые URL, security-заголовки (CSP, HSTS…), остальное — Static Assets. Неизвестный путь → `public/404.html` со статусом 404.
- Контент (кейсы, тексты) подтягивается в браузере из CMS: `https://admin.imtrtd.space/api/content` (`assets/site-api.js`); статичный HTML — рабочий фолбэк.
- Форма брифа шлёт `POST https://admin.imtrtd.space/api/leads` (studio).
- Локально: `cd apps/hq && npx wrangler@4.88.0 dev` (на `http://127.0.0.1` worker редиректит на https — для проверок передавайте заголовок `x-forwarded-proto: https`).

### Кэш и `?v=` — обязательное правило

Из `apps/hq/public/_headers`:

- `/assets/*` и `/fonts/*` — `max-age=31536000, immutable` (год, без перепроверки).
  - CSS собран в **один хэшированный файл** `assets/site-<sha256[:8]>.css`. Поменяли CSS → новое имя файла → обновить ссылку во всех HTML.
  - Нехэшированные файлы (`studio.js`, `site-api.js`, `contact.js`, `practice.js`, `samples.js`, `practice.css`, `fonts/*.css`) подключаются с `?v=…`. **Изменили такой файл — поднимите его `?v=` во всех HTML, которые его подключают**, иначе посетители до года видят старую копию.
- `/images/*`, `/brand/*`, `/og.png`, favicon — неделя.
- HTML — без кэша (`max-age=0`), поэтому новые `?v=` подхватываются сразу после деплоя.

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
```

## Структура

```text
apps/
  hq/           # imtrtd.space — статичный сайт студии (Worker imtrtd-hq)
  studio/       # admin.imtrtd.space — CMS, API заявок, кабинет /admin
  portfolio/    # imtryingtodesign.com — портфолио Next/Vinext
  tg-bot/       # namenlos-tg-bot
  cuebox/       # prompt library (Vercel)
docs/
  PROJECTS.md   # карта доменов и воркеров
packages/
  shared/       # общие типы
```

## История

Раньше код жил в отдельных репозиториях (`imtrtdweb`, `www.imtryingtodesign.com`, `cuebox`). Репозиторий `imtrtd/imtrtd-site-preview` заархивирован; актуальный сайт — `apps/hq` здесь.
