# Studio

Studio combines a public-facing site with a private workspace for managing site content and enquiries.

## What it includes

- A responsive studio website with project stories, services, and a contact form
- A workspace for reviewing enquiries and updating site content
- Email notifications and media management

## Local development

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev
```

The local site is available at `http://localhost:5173`. Use the example environment file as a starting point and keep real credentials in your local, untracked configuration.

To run the tests:

```bash
npm test
```
