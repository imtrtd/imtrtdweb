# Security Policy

## Supported branch

Security fixes are prepared against `main` and released through the normal pull request flow.

## Reporting

Please report sensitive issues privately instead of opening a public issue. Use GitHub private vulnerability reporting when it is enabled, or contact `info@imtryingtodesign.com` with a short summary, affected route, reproduction steps, and expected impact.

## Scope

In scope:

- authentication and session handling
- user data isolation
- import and export endpoints
- database access patterns
- accidental exposure of secrets or account data
- dependency vulnerabilities that affect runtime behavior

Out of scope:

- spam, scraping, or denial-of-service testing without prior permission
- social engineering
- issues that require access to someone else's account without consent

## Operational notes

- Never commit `.env*`, database URLs, Auth.js secrets, or Vercel credentials.
- Rotate any secret that appears in a commit, build log, or issue thread.
- Keep production `AUTH_SECRET` unique and at least 32 characters long.
- Review failed deployment and quality checks before merging release branches.
