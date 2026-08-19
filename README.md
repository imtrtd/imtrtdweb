# I'm Trying To Design — monorepo

Единый репозиторий экосистемы **imtryingtodesign.com**: маркетинговый сайт студии, портфолио и Cuebox.

## Приложения

| App | Путь | Домен | Стек | Деплой |
| --- | --- | --- | --- | --- |
| **Studio** | `apps/studio` | `imtryingtodesign.com` (prod Worker `imtrtdweb`) | Vite + React + Worker API + D1/DO | Cloudflare Workers |
| **Portfolio** | `apps/portfolio` | `imtryingtodesign.com` (Worker `imtryingtodesign`) | Next.js + Vinext | Cloudflare Workers |
| **Cuebox** | `apps/cuebox` | `app.imtryingtodesign.com` | Next.js + Prisma + Auth.js | Vercel |

Подробнее: [docs/PROJECTS.md](./docs/PROJECTS.md)

## Быстрый старт

```bash
# Установить зависимости всех приложений
npm run install:all

# Studio — лендинг + /admin + API заявок
npm run dev:studio          # http://localhost:5173

# Portfolio — портфолио с case studies
npm run dev:portfolio

# Cuebox — библиотека промптов
npm run dev:cuebox
```

## Деплой

**Studio (основной прод с CMS):**

```bash
cd apps/studio
cp .dev.vars.example .dev.vars
npm run publish:cloudflare   # bootstrap D1/R2 + secrets + deploy
```

CI на `main` деплоит **только studio** (`.github/workflows/deploy.yml`).

Portfolio и Cuebox деплоятся отдельно из своих каталогов (`npm run deploy` / Vercel).

## Структура

```text
apps/
  studio/       # лендинг, форма заявок, кабинет /admin
  portfolio/    # портфолио Next/Vinext (work/, systems/)
  cuebox/       # prompt library
docs/
  PROJECTS.md   # карта продуктов и DNS
packages/
  shared/       # общие типы (расширяется по мере слияния)
```

## Консолидация

Раньше код жил в отдельных репозиториях (`imtrtdweb`, `www.imtryingtodesign.com`, `cuebox`). Этот монорепо — единая точка правды. Следующий шаг (опционально): слить portfolio + studio в один Worker и один фронт.
