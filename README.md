# I'm Trying To Design (imtrtdweb)

Лендинг студии дизайна + заявки + кабинет (`/admin`) на Cloudflare Workers, D1 и R2.

Домен: `imtryingtodesign.com`

## Возможности

- Публичный лендинг (hero, работы, услуги, процесс, форма заявки)
- `POST /api/leads` → D1, honeypot + rate limit
- Email студии + автоответ клиенту (если контакт — email) через Resend
- Кабинет `/admin`: дашборд, inbox, CMS, загрузка картинок в R2
- Роли: `ADMIN_TOKEN` (owner) / `EDITOR_TOKEN` (editor, без удаления)
- Follow-up: следующий шаг + ссылка на бриф
- Hourly cron: напоминание по заявкам `new` старше 24ч
- Опционально: Cloudflare Web Analytics (`cf_beacon_token` в CMS)

## Локально

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

- Сайт: http://localhost:5173
- Админка: http://localhost:5173/admin

## Фаза 0 — публикация

### A. Секреты GitHub Actions

Репозиторий → Settings → Secrets and variables → Actions:

| Secret | Назначение |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | шаблон **Edit Cloudflare Workers** (+ D1/R2 edit) |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID в Dashboard |

### B. DNS

`imtryingtodesign.com` должен быть в Cloudflare (NS у регистратора → Cloudflare).

### C. Bootstrap ресурсов (один раз)

Локально с теми же env:

```bash
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
export ADMIN_TOKEN=...          # обязательно
export EDITOR_TOKEN=...         # рекомендуется
export RESEND_API_KEY=...       # опционально
npm run publish:cloudflare
```

Скрипт создаст D1/R2 (если нужно), пропишет `database_id`, применит миграции, выставит secrets и задеплоит.

Или вручную:

```bash
npx wrangler login
npx wrangler d1 create imtrtdweb   # → database_id в wrangler.jsonc
npx wrangler r2 bucket create imtrtdweb-media
npm run db:migrate:remote
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put EDITOR_TOKEN
npm run deploy
```

### D. CI

После merge в `main` workflow `.github/workflows/deploy.yml` применяет миграции и деплоит Worker.

Закройте `/admin` через [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/policies/access/).

## API кратко

| Метод | Путь | Доступ |
| --- | --- | --- |
| GET | `/api/content` | public |
| GET | `/api/media/*` | public |
| POST | `/api/leads` | public |
| GET | `/api/admin/me` | owner/editor |
| GET | `/api/admin/stats` | owner/editor |
| GET | `/api/admin/leads` | owner/editor |
| PATCH | `/api/admin/leads/:id` | owner/editor |
| GET | `/api/admin/content` | owner/editor |
| PUT | `/api/admin/copy` | owner/editor |
| POST | `/api/admin/media` | owner/editor |
| POST | `/api/admin/cases` | owner/editor |
| DELETE | `/api/admin/cases/:id` | owner only |
| POST | `/api/admin/services` | owner/editor |
| DELETE | `/api/admin/services/:id` | owner only |
