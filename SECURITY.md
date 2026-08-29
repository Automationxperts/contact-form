# Security Policy

## Supported versions

Only the latest release on the `main` branch receives security fixes.

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately through GitHub's [Security Advisories](https://github.com/Automationxperts/contact-form/security/advisories/new).
Include reproduction steps, affected files and impact. You can expect an
acknowledgement within a few days.

## Security model

GitConnect handles untrusted, publicly submitted input. The design assumptions are:

| Control | Where | What it prevents |
| --- | --- | --- |
| Origin allow-list | [lib/cors.js](lib/cors.js) | Third parties reusing your endpoint and burning your GitHub App rate limit |
| Length caps + email validation | [lib/validate.js](lib/validate.js) | Oversized payloads, malformed data |
| Control-character stripping | [lib/validate.js](lib/validate.js) | Terminal/log injection |
| Reference neutralisation | [lib/validate.js](lib/validate.js) | Submitters mass-notifying users via `@mentions` or cross-linking issues |
| Dynamic code fences | [lib/validate.js](lib/validate.js) | User text forging the `**Name:**` header fields parsed downstream |
| Honeypot + timing check | [lib/validate.js](lib/validate.js) | Naive spam bots |
| Cloudflare Turnstile (optional) | [lib/turnstile.js](lib/turnstile.js) | Determined spam bots |
| Generic error responses | [lib/handler.js](lib/handler.js) | Leaking GitHub API internals or configuration state |
| No comment URL in the response | [lib/handler.js](lib/handler.js) | Walking back to the thread to read other people's submissions |
| `github-script` instead of shell interpolation | [.github/workflows/export-csv.yml](.github/workflows/export-csv.yml) | Command injection through the comment body |
| CSV quoting + formula guard | [.github/workflows/export-csv.yml](.github/workflows/export-csv.yml) | Spreadsheet formula injection |

## Deployment checklist

- [ ] Set `ALLOWED_ORIGINS` to your real domains. Never ship `*` to production.
- [ ] Store `GH_PRIVATE_KEY` as a **secret**, not a plain environment variable, where your host distinguishes the two.
- [ ] Give the GitHub App only `Discussions: Read & write`. Nothing else.
- [ ] Install the App on a single backend repository, not on your whole account.
- [ ] Keep the backend repository (the one holding Discussions) **private** if submissions contain personal data.
- [ ] Leave `EXPORT_INCLUDE_EMAIL` unset so the CSV export masks email addresses.
- [ ] Rotate the private key if it is ever exposed: GitHub App settings → Private keys → Generate, then delete the old one.

## Known limitations

- **No rate limiting.** Serverless functions have no shared state by default.
  Use your host's built-in protection (Cloudflare WAF rate-limiting rules,
  Netlify/Vercel firewall) plus Turnstile for anything public-facing.
- **Data lives in GitHub Discussions.** Anyone with read access to that
  repository can read every submission. Choose the repository accordingly.
