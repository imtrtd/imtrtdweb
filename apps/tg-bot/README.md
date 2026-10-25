# namenlos-tg-bot — @GrokAssistant_ai

Telegram group bot for the forum supergroup «Главная», on Cloudflare Workers.

- **Webhook**: `POST /telegram/webhook` (checked via `X-Telegram-Bot-Api-Secret-Token`, derived from the bot token).
- **Mini App**: `GET /app` + `POST /api/*` (Telegram `initData` HMAC validated server-side).
- **Setup**: `POST /setup` with `X-Setup-Key` (HMAC-SHA256 of `setup:namenlos` keyed by the bot token) runs
  `setWebhook`, `setMyCommands` (private / groups / admins), `setMyDescription`, `setMyShortDescription`, `setChatMenuButton`.
  The deploy workflow calls it after every deploy.
- **Cron** (every minute): task reminders (Europe/Kiev), auto-delete of service notices, housekeeping.
  Every 5 min it also checks `getWebhookInfo`: if another service (e.g. ManyChat) took the webhook, it logs a warning and
  re-sets ours — **at most once per hour** (throttle stored in the `kv` table), so it never silently ping-pongs.
- **Storage**: one SQLite-backed Durable Object (`BotStore`) — chats, settings, users, members/warns, message history (AI context),
  lists, tasks.
- **Auto-plans** (`src/plan.ts`): a group message with ≥2 list lines (`-`, `•`, `1.`…) or a dated/timed multi-line message with
  a task cue («надо», «задачи», «подготовить»…) is parsed by Workers AI into tasks (title, due in Europe/Kiev relative to the message
  date, optional assignee), saved to `tasks` and echoed as a checklist with ✅ buttons — in the same topic, or (from General) in the
  topic picked by content (`FORUM_TOPICS` var + topics learned from updates), else «Задачи». Needs ≥2 tasks (1 with an explicit
  «задача»/«todo» cue). Each source message is processed once (`plans_seen`); edits are not subscribed to, so they never re-create tasks.
- **Maintainer API**: `GET|POST /admin/tasks` with the same `X-Setup-Key` as `/setup` — list home-group tasks / create a plan
  (`{thread_id, header, tasks:[{title, due_local, remind_local}], edit_message_id?}`). Tasks support a separate `remind_at`.
- **Guide** («📖 Как пользоваться»): `GET /app/guide` (alias `/guide`) serves `src/guide.html` — a Russian, mobile-first how-to
  with screenshots/GIFs from `public/guide-media/` (Workers static assets). Entry points: `/guide`, and a button under `/start` and
  `/help` — `web_app` in private chat, `url` → `https://t.me/GrokAssistant_ai/GrokHelper?startapp=guide` in groups (the Mini App
  redirects to the guide when `start_param=guide`; `/start guide` in private chat also works). There is a guide button on the Panel too.
  Regenerate media (mock data only): `npm i --no-save playwright-core && node scripts/guide/capture.cjs`
  (needs Google Chrome and ffmpeg; writes PNGs + palette GIFs to `public/guide-media/`). `mock.html` draws the Telegram-style
  chat examples (`?scene=plan|done|panel|reminder|task|tasks|list|ask|poll|topics&step=N`).
- **Service-message cleanup**: `clean_service` (default on) deletes join/leave notices; `clean_settings` (default on, toggle
  «🧽 Удалять сообщения о настройках» in `/settings` and the Panel) deletes "group settings / system" service messages —
  see `SETTINGS_SERVICE_FIELDS` in `src/bot.ts` (title/photo, pins, topic edited/closed/reopened, General hidden/unhidden,
  auto-delete timer, video chats, background, boosts, migrations, giveaways…). `forum_topic_created` is never deleted (that would
  delete the whole topic). Delete failures (too old / no rights) are ignored. Only new messages are cleaned; history can't be enumerated.
- **AI**: Workers AI binding (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`, fallback `@cf/meta/llama-3.1-8b-instruct`).

- **MCP server** (`src/mcp.ts`): remote MCP over Streamable HTTP (stateless, JSON responses) at
  `https://namenlos-tg-bot.unitl.workers.dev/mcp`, header `Authorization: Bearer <MCP_KEY>` (anything else → 401).
  Built on `@modelcontextprotocol/sdk` (`WebStandardStreamableHTTPServerTransport`); tools only call the shared logic in
  `tasks.ts` / `lists.ts` / `plan.ts` / `bot.ts` / `setup.ts`. Default chat = «Главная» (`HOME_CHAT_ID`); times are Europe/Kiev
  (`"YYYY-MM-DD HH:MM"` or Russian like `"завтра 10:00"`); topics by id or name.
  Tools: `list_tasks`, `create_tasks` (optional `post_checklist` like auto-plans), `update_task`, `complete_task`, `reopen_task`,
  `delete_task`, `list_lists`, `create_list`, `add_list_items`, `toggle_list_item`, `create_poll`, `list_topics`, `create_topic`,
  `rename_topic`, `send_message`, `edit_message` / `delete_message` (bot's own messages only), `get_settings`, `set_setting`,
  `bot_status` (webhook/health, no secrets).
  Client config example:
  ```json
  { "mcpServers": { "namenlos-tg-bot": { "url": "https://namenlos-tg-bot.unitl.workers.dev/mcp",
      "headers": { "Authorization": "Bearer ${NAMENLOS_TG_MCP_KEY}" } } } }
  ```

Deploy: `.github/workflows/deploy-tg-bot.yml` (secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `NAMENLOS_TG_BOT_TOKEN`,
`NAMENLOS_TG_MCP_KEY` → uploaded as Worker secret `MCP_KEY` on every deploy). To rotate the MCP key: update the repo secret and
re-run the workflow.

Local check: `npm ci && npm run check && npx wrangler deploy --dry-run --outdir dist` (Node 22+).
