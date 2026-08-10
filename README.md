# imtrtdweb

Сайт на Cloudflare Workers (React + Vite) с custom domain `imtryingtodesign.com`.

## Локальная разработка

```bash
npm install
npm run dev
```

Откройте `http://localhost:5173`.

## Публикация на Cloudflare

Проект уже настроен под Cloudflare Workers (`wrangler.jsonc`). Статика отдаётся как SPA, API — через Worker.

### 1. Секреты в GitHub

В репозитории: **Settings → Secrets and variables → Actions** добавьте:

| Secret | Где взять |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | [Create Token](https://dash.cloudflare.com/profile/api-tokens) → шаблон **Edit Cloudflare Workers** |
| `CLOUDFLARE_ACCOUNT_ID` | Dashboard → Workers & Pages → справа **Account ID** |

### 2. Домен

`imtryingtodesign.com` должен быть в вашем аккаунте Cloudflare (NS у регистратора → Cloudflare). В `wrangler.jsonc` уже указан custom domain.

### 3. Деплой

**Автоматически:** каждый push в `main` запускает workflow `.github/workflows/deploy.yml`.

**Вручную из терминала:**

```bash
npm run deploy
```

Нужна авторизация Wrangler (`npx wrangler login`) или переменные `CLOUDFLARE_API_TOKEN` и `CLOUDFLARE_ACCOUNT_ID`.

После успешного деплоя сайт будет доступен на:

- `https://imtryingtodesign.com`
- `https://imtrtdweb.<subdomain>.workers.dev`

## Полезные команды

```bash
npm run build      # production-сборка
npm run preview    # локальный preview собранного билда
npm run check      # typecheck + dry-run deploy
npm test           # vitest
```

## Документация

- [Cloudflare Workers](https://developers.cloudflare.com/workers/)
- [Wrangler](https://developers.cloudflare.com/workers/wrangler/)
- [Workers + Assets (SPA)](https://developers.cloudflare.com/workers/static-assets/)
