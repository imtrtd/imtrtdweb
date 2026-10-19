# apps/hq

Static studio site for **imtrtd.space** (merged ImTryingToDesign site). It is served by the assets-only Worker `imtrtd-hq`, with custom domains `imtrtd.space` and `www.imtrtd.space`.

- `public/`: the built site (plain HTML/CSS/JS, plus embedded demo builds under `public/sites/`).
- Deploy: push to `main` touching `apps/hq/**`, or run the "Deploy HQ to Cloudflare" workflow manually.
- Local preview: `npx wrangler@4.88.0 dev` from this folder, or any static server on `public/`.

## Russian version (`/ru/`)

- `public/ru/**` is **generated** — do not edit by hand. Source of truth: the EN pages in `public/` + approved translations in `i18n/ru.json` (page → `[{en, ru}]`).
- After changing an EN page or `i18n/ru.json`, run `python3 apps/hq/scripts/build-ru.py` (needs `pip install beautifulsoup4`) and commit the output. `--check` exits non-zero if a visible string is left untranslated.
- The script also: adds the EN/RU switcher + `hreflang` alternates to the EN pages, writes `public/assets/i18n-ru.js` (strings used by the JS: brief modal, Practice steps/checklist e-mail, Samples brief/mailto, clock, copy buttons, CMS mapping) and `public/sitemap.xml` with alternates.
- The JS files use `T('English text')`; on `<html lang="ru">` pages it returns the approved Russian string, on EN pages the key itself.
- CMS (`admin.imtrtd.space/api/content`) is English-only: on RU pages a CMS string is shown only if it has an approved translation; otherwise the static Russian copy stays. Email/Telegram always apply.
- Language choice is stored in `localStorage["imtrtd-lang"]` when the switcher is clicked; arriving from another site on the "wrong" language switches once per session. No browser-language auto-redirect.
