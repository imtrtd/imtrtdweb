# I'm Trying To Design (imtrtdweb)

Лендинг студии дизайна + заявки + кабинет (`/admin`) на Cloudflare Workers, D1 и R2.

Домен: `imtryingtodesign.com`

## Возможности

- Публичный лендинг (hero, работы, услуги, процесс, форма заявки)
- `POST /api/leads` → D1, honeypot + rate limit, опциональный Resend
- Кабинет `/admin`: дашборд, inbox, CMS, загрузка картинок в R2
- Роли: `ADMIN_TOKEN` (owner) и `EDITOR_TOKEN` (editor, без удаления)
- Follow-up у заявки: следующий шаг + ссылка на бриф
- Hourly cron: напоминание по заявкам `new` старше 24ч

## Локально

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

- Сайт: http://localhost:5173
- Админка: http://localhost:5173/admin

## Публикация на Cloudflare

### 1. Секреты GitHub Actions

| Secret | Назначение |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | шаблон **Edit Cloudflare Workers** |
| `CLOUDFLARE_ACCOUNT_ID` | Account ID в Dashboard |

### 2. D1 + R2

```bash
npx wrangler login
npx wrangler d1 create imtrtdweb
npx wrangler r2 bucket create imtrtdweb-media
```

Подставьте `database_id` в [wrangler.jsonc](wrangler.jsonc), затем:

```bash
npm run db:migrate:remote
```

### 3. Worker secrets

```bash
npx wrangler secret put ADMIN_TOKEN
npx wrangler secret put EDITOR_TOKEN
# опционально:
npx wrangler secret put RESEND_API_KEY
```

### 4. Деплой

Push в `main` → [.github/workflows/deploy.yml](.github/workflows/deploy.yml), или:

```bash
npm run deploy
```

Рекомендуется закрыть `/admin` через Cloudflare Access.

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
