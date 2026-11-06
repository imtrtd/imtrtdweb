# TrueSightPsy (`apps/psihovika`)

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
- `src/lib/auth/server.ts` is pre-wired — prefer not to rewrite it. Email/password — только флаг в `src/lib/auth/email-password.ts`.
- Данные методик: `src/data/`. Научные метаданные: `src/data/refs.ts`. Прохождение: `src/components/runner.tsx`.
- Тема: `src/lib/theme.tsx` + `data-theme` на `<html>` (по умолчанию тёмная).
- Команда и админка: `/team`, `/admin`; публичный редактор сайта: `/editor` (`site_content`). CMS: `src/lib/cms/`, миграции `0002_teams_cms.sql`, `0003_site_content.sql`.
- Cloudflare Workers without `DATABASE_URL`/`PSY_DATABASE_URL`: public catalog SSR works; Better Auth uses an in-memory adapter + ephemeral secret. Persistent accounts/CMS need Neon + Better Auth secrets.
- Наполнение сайта: `/login` → `/editor` (правки в `site_content` сразу на каталоге и `/m/$id`). Командная админка: `/team` → `/admin`.

## Деплой (GitHub → Cloudflare Workers)

```bash
npm --prefix apps/psihovika run deploy   # build:cloudflare + wrangler deploy
```

Локально (`npm run build` / `dev`) — Nitro/Vercel preset. Прод — `DEPLOY_TARGET=cloudflare` через `build:cloudflare`.

CI: `.github/workflows/deploy-psihovika.yml` на push в `main` по `apps/psihovika/**`.
Секреты репозитория: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
Секреты для CMS/auth: `PSY_DATABASE_URL` или `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (деплой синхронизирует их на Worker).
`EDITOR_EMAILS` — список email (через запятую) с правом правки каталога в `/editor`; без него редактор отключён.
