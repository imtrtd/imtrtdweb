# Telegram bot

A group assistant for keeping shared tasks, lists, and reminders organized. It also includes a mobile-friendly guide and optional AI-assisted task planning.

## Local development

Use Node.js 22 or newer.

```bash
npm ci
npm run check
npm run dev
```

Running the bot locally requires its service configuration. Keep credentials in local environment settings or your deployment provider's secret store, never in source files or commits.

The main bot logic and task planning are in `src/`; the guide and its media are in `src/guide.html` and `public/guide-media/`.
