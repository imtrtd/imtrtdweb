# ПсихоВика (`apps/psihovika`)

Каталог психологических методик (рус.). TanStack Start + Vite + Better Auth + PGLite/Neon.

## Команды

```bash
npm --prefix apps/psihovika ci
npm --prefix apps/psihovika run dev    # http://0.0.0.0:8080
npm --prefix apps/psihovika run build
npm --prefix apps/psihovika test
```

## Важно

- Ответы пользователя хранятся в браузере (`src/lib/storage.ts`), не на сервере.
- Не переписывать `src/lib/auth/server.ts`. Email/password — только флаг в `src/lib/auth/email-password.ts`.
- Данные методик: `src/data/`. Научные метаданные: `src/data/refs.ts`. Прохождение: `src/components/runner.tsx`.
- Тема: `src/lib/theme.tsx` + `data-theme` на `<html>` (по умолчанию тёмная).
- Команда и админка: `/team`, `/admin`, серверные функции в `src/lib/cms/`, миграция `migrations/0002_teams_cms.sql`.
- Для продакшена с аккаунтами и командой нужен `DATABASE_URL` (Neon) и auth-секреты Better Auth.

## Деплой (GitHub → Cloudflare Workers)

```bash
npm --prefix apps/psihovika run deploy   # build:cloudflare + wrangler deploy
```

Локально (`npm run build` / `dev`) — Nitro/Vercel preset. Прод — `DEPLOY_TARGET=cloudflare` через `build:cloudflare`.

CI: `.github/workflows/deploy-psihovika.yml` на push в `main` по `apps/psihovika/**`.
Секреты репозитория: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
Для входа/команды на проде: `wrangler secret put DATABASE_URL` (Neon) и Better Auth secrets.
