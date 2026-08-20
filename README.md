# I'm Trying To Design — monorepo

Публичный сайт: **I/TD portfolio** на Cloudflare Workers (аккаунт Proton).

| App | Путь | Домен |
| --- | --- | --- |
| **Studio** | `apps/studio` | `imtryingtodesign.com` — I/TD design + `/admin` |
| **Portfolio** | `apps/portfolio` | исходник того же дизайна (Next/Vinext) |
| **Cuebox** | `apps/cuebox` | `app.imtryingtodesign.com` |

```bash
npm --prefix apps/studio ci
npm run dev:studio
npm run deploy:studio
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
