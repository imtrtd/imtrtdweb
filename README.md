# I'm Trying To Design (imtrtdweb)

Лендинг студии дизайна + заявки + внутренний кабинет (`/admin`) на Cloudflare Workers + D1.

Домен: `imtryingtodesign.com`

## Возможности

- Публичный лендинг (hero, работы, услуги, процесс, форма заявки)
- `POST /api/leads` → D1, honeypot + rate limit
- Кабинет `/admin`: inbox заявок и CMS (тексты, кейсы, услуги)
- Опционально: email через Resend (`RESEND_API_KEY`)

## Локально

```bash
npm install
cp .dev.vars.example .dev.vars   # задайте ADMIN_TOKEN
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

### 2. D1

```bash
npx wrangler login
npx wrangler d1 create imtrtdweb
```

Подставьте полученный `database_id` в [wrangler.jsonc](wrangler.jsonc), затем:

```bash
npm run db:migrate:remote
```

### 3. Worker secrets

```bash
npx wrangler secret put ADMIN_TOKEN
# опционально:
npx wrangler secret put RESEND_API_KEY
```

### 4. Деплой

Push в `main` запускает [.github/workflows/deploy.yml](.github/workflows/deploy.yml), или вручную:

```bash
npm run deploy
```

После деплоя желательно закрыть `/admin` через [Cloudflare Access](https://developers.cloudflare.com/cloudflare-one/applications/configure-apps/self-hosted-public-app/).

## API кратко

| Метод | Путь | Доступ |
| --- | --- | --- |
| GET | `/api/content` | public |
| POST | `/api/leads` | public |
| GET | `/api/admin/leads` | Bearer ADMIN_TOKEN |
| PATCH | `/api/admin/leads/:id` | Bearer ADMIN_TOKEN |
| GET | `/api/admin/content` | Bearer ADMIN_TOKEN |
| PUT | `/api/admin/copy` | Bearer ADMIN_TOKEN |
| POST | `/api/admin/cases` | Bearer ADMIN_TOKEN |
| DELETE | `/api/admin/cases/:id` | Bearer ADMIN_TOKEN |
| POST | `/api/admin/services` | Bearer ADMIN_TOKEN |
| DELETE | `/api/admin/services/:id` | Bearer ADMIN_TOKEN |
