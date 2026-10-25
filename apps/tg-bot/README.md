# namenlos-tg-bot — @GrokAssistant_ai

Telegram group bot for the forum supergroup «Главная», on Cloudflare Workers.

- **Webhook**: `POST /telegram/webhook` (checked via `X-Telegram-Bot-Api-Secret-Token`, derived from the bot token).
- **Mini App**: `GET /app` + `POST /api/*` (Telegram `initData` HMAC validated server-side).
- **Setup**: `POST /setup` with `X-Setup-Key` (HMAC-SHA256 of `setup:namenlos` keyed by the bot token) runs
  `setWebhook`, `setMyCommands` (private / groups / admins), `setMyDescription`, `setMyShortDescription`, `setChatMenuButton`.
  The deploy workflow calls it after every deploy.
- **Cron** (every minute): task reminders (Europe/Kiev), auto-delete of service notices, housekeeping.
- **Storage**: one SQLite-backed Durable Object (`BotStore`) — chats, settings, users, members/warns, message history (AI context),
  lists, tasks.
- **Auto-plans** (`src/plan.ts`): a group message with ≥2 list lines (`-`, `•`, `1.`…) or a dated/timed multi-line message with
  a task cue («надо», «задачи», «подготовить»…) is parsed by Workers AI into tasks (title, due in Europe/Kiev relative to the message
  date, optional assignee), saved to `tasks` and echoed as a checklist with ✅ buttons — in the same topic, or (from General) in the
  topic picked by content (`FORUM_TOPICS` var + topics learned from updates), else «Задачи». Needs ≥2 tasks (1 with an explicit
  «задача»/«todo» cue). Each source message is processed once (`plans_seen`); edits are not subscribed to, so they never re-create tasks.
- **Maintainer API**: `GET|POST /admin/tasks` with the same `X-Setup-Key` as `/setup` — list home-group tasks / create a plan
  (`{thread_id, header, tasks:[{title, due_local, remind_local}], edit_message_id?}`). Tasks support a separate `remind_at`.
- **AI**: Workers AI binding (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`, fallback `@cf/meta/llama-3.1-8b-instruct`).

Deploy: `.github/workflows/deploy-tg-bot.yml` (secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NAMENLOS_TG_BOT_TOKEN`).

Local check: `npm ci && npm run check && npx wrangler deploy --dry-run --outdir dist` (Node 22+).
