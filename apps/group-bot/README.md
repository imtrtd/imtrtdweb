# @imtrtd_groups_bot — IMTRTD Group Automation

Cloudflare Worker (`imtrtd-groups-bot`, account **unitl**) → https://imtrtd-groups-bot.unitl.workers.dev

Storage: one SQLite Durable Object (`GroupStore`), no D1/KV needed. Cron `* * * * *`: reminders, captcha timeouts, auto-deleting bot notices.

## Groups
| | |
|---|---|
| Приветствие | `/setwelcome текст` (`{name}`, `{username}`, `{chat}`), `/set welcome on|off` |
| Сервисные сообщения | вход/выход удаляются (`/set cleanservice on|off`) |
| Правила | `/rules`, `/setrules` (админы) |
| Капча | новичок без прав, кнопка «🤖 Я не бот» (`/set captchasec 120`), иначе кик (бан на 60 с + разбан) |
| Новички | первые N мин только текст, без медиа (`/set newbie 60`) |
| Ссылки | удаляются у участников, вступивших < X мин назад (`/set antilink on`, `/set linkmin 1440`) |
| Флуд | >N сообщений за S сек → мут (`/set flood 6`, `floodsec 10`, `floodmute 10`) |
| Слова | `/addword`, `/delword`, `/words` |
| Модерация (ответом) | `/warn` (3 → мут 24 ч), `/unwarn`, `/mute [мин]`, `/unmute`, `/ban`, `/unban`, `/del` |
| Напоминания | `/remind 18:30 текст`, `/remind завтра 9:00 …`, `/remind 31.12 23:55 …`, `/remind через 15 мин …`, `/reminders`, `/delremind ID` (время Киева) |
| Настройки | `/settings`, `/set` |

Admin check: `getChatMember`, cached 2 min per isolate; anonymous admins supported. The bot needs admin rights *Delete messages* + *Ban users*.

## Telegram Business (owner: @AkakiiJ)
Only a Business connection from `OWNER_USERNAME` / `OWNER_ID` is accepted; that user becomes the owner (kv `owner_id`).
Incoming private messages are answered via `sendMessage` + `business_connection_id` if the connection is enabled and has the reply right.
Never answers the owner's own messages; after the owner writes in a chat the bot stays silent there for 30 min.

* No `XAI_API_KEY` secret → short cold "seen, will reply later" template written as the owner (no emoji, no project mentions, no "автоответ"), once per chat per `/cooldown` hours (default 12).
* With `XAI_API_KEY` (optional secret, from repo secret `IMTRTD_GROUPS_XAI_API_KEY`) → AI mode is ON by default (until `/business ai off`): first-person, cold/cynical but useful answers in the sender's language, never mentioning a bot/auto-reply, emoji stripped; NAMENLOS / imtrtd.space are mentioned only when the person asks about tattoos or websites.

Owner DM commands: `/business`, `/business on|off`, `/business ai on|off`, `/setautoreply текст`, `/pause N`, `/cooldown H`.

Connect: Telegram → Settings → Telegram Business → Chatbots → `@imtrtd_groups_bot`, allow *reply to messages* (disconnect the previous bot first).

## Deploy
`.github/workflows/deploy-group-bot.yml` (repo secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `IMTRTD_GROUPS_BOT_TOKEN`).
After deploy it calls `POST /setup` (key = HMAC-SHA256(token, `setup:imtrtd-groups`)) → setWebhook (secret_token = HMAC(token, `webhook:imtrtd-groups`)[:64], incl. business updates), setMyCommands, descriptions.
