# Security Policy

## Supported branch

Security fixes are prepared against `main` and released through the normal review flow.

## Reporting

Please report sensitive issues privately instead of opening a public issue. Use GitHub private vulnerability reporting when it is enabled, or contact `hello@imtryingtodesign.com` with a short summary, affected route, and reproduction notes.

## Scope

In scope:

- public pages and route handling
- Cloudflare Worker runtime behavior
- accidental exposure of secrets or internal files
- dependency issues that affect the deployed site

Out of scope:

- placeholder portfolio copy corrections
- social engineering
- denial-of-service testing without prior permission

## Operational notes

- Keep `.env*`, Wrangler credentials, and local runtime folders out of Git.
- Rotate any secret that appears in a commit, build log, or issue thread.
- Review Cloudflare Workers build failures before merging release branches.
