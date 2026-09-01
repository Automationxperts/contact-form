<div align="center">

# GitConnect

**A free contact form for static sites. Submissions land in your GitHub Discussions.**

No database. No monthly fee. No third party reading your visitors' messages.

[![CI](https://github.com/Automationxperts/contact-form/actions/workflows/ci.yml/badge.svg)](https://github.com/Automationxperts/contact-form/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](package.json)

[Setup](docs/SETUP.md) · [Deploy](docs/DEPLOY.md) · [Architecture](docs/ARCHITECTURE.md) · [Security](SECURITY.md) · [Contributing](CONTRIBUTING.md)

</div>

---

## Why

Static sites can't process forms. The usual answers all have a catch:

| Option | The catch |
| --- | --- |
| Formspree / Getform / Basin | Free tier caps out at ~50 submissions/month, then it's a subscription |
| `mailto:` links | Opens the visitor's mail client. Most of them bounce |
| Google Forms | Off-brand, and Google processes your visitors' data |
| Roll your own + database | A database, a schema, backups and a bill, for a contact form |

GitConnect posts each submission as a comment on a GitHub Discussion in a
repository you own. You already have notifications, search, threading, an audit
trail and webhooks. You pay nothing.

## Features

- **Deploy anywhere** — one codebase runs unchanged on Cloudflare Pages, Netlify and Vercel free tiers
- **Write-only by design** — no code path can read, list or query submissions; the API never returns a thread URL
- **Spam resistant** — honeypot field, submission-timing check and optional [Cloudflare Turnstile](https://developers.cloudflare.com/turnstile/)
- **Hardened input handling** — length caps, email validation, control-character stripping, and `@mention` neutralisation so submitters can't mass-ping your users
- **Origin allow-listing** — nobody else can point their form at your endpoint
- **One-file configuration** — rebrand it and redefine the categories in [`public/config.js`](public/config.js)
- **CSV export** — an included workflow appends every submission to a spreadsheet-safe CSV
- **No build step** — plain ES modules, one runtime dependency, ~250 lines of frontend JS
- **Accessible** — labelled inputs, keyboard navigation, skip link, `prefers-reduced-motion`, live error announcements

## Quick start

```bash
git clone https://github.com/Automationxperts/contact-form.git
cd contact-form
npm install
cp .env.example .env.local   # fill in your GitHub App credentials
npm run dev                  # http://localhost:8788
```

Then:

1. Create a GitHub App with `Discussions: Read & write` and install it on one repository → **[SETUP.md](docs/SETUP.md)**
2. Create one Discussion thread per form category and collect their node IDs
3. Edit [`public/config.js`](public/config.js) with your branding and categories
4. Deploy and set the environment variables → **[DEPLOY.md](docs/DEPLOY.md)**

## How it works

```mermaid
flowchart LR
    A[Visitor] --> B[Static site]
    B -->|POST /api/github-submit| C[Serverless function]
    C -->|GitHub App JWT| D[GitHub GraphQL API]
    D --> E[(Discussion thread)]
    E -.webhook.-> F[Actions workflow]
    F --> G[data/submissions.csv]
```

The function authenticates as a GitHub App installation, mints a short-lived
token, and appends a single `addDiscussionComment` mutation. It has no read
capability at all. Full details in [ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Configuration

`public/config.js` is public by design and contains no secrets:

```js
window.GITCONNECT_CONFIG = {
  brand: {
    name: 'Acme Support',
    tagline: 'Talk to a human.',
    description: 'We usually reply within one business day.',
    owner: 'Acme Inc.',
    repoUrl: 'https://github.com/acme/website',
  },
  endpoint: '/api/github-submit',
  categories: [
    { value: 'general', label: 'General Inquiry' },
    { value: 'bug', label: 'Report a Problem' },
  ],
  showSubjectField: true,
  turnstileSiteKey: '',
};
```

Credentials live in environment variables — see [`.env.example`](.env.example):

| Variable | Required | Purpose |
| --- | --- | --- |
| `GH_APP_ID` | Yes | GitHub App ID |
| `GH_PRIVATE_KEY` | Yes | Contents of the `.pem` file |
| `GH_INSTALLATION_ID` | Yes | Installation ID |
| `DISCUSSION_IDS` | Yes | JSON map of category → discussion node ID |
| `ALLOWED_ORIGINS` | Recommended | Comma-separated origins allowed to POST |
| `TURNSTILE_SECRET_KEY` | No | Enables captcha verification |

## API

**`POST /api/github-submit`**

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "type": "general",
  "subject": "Optional subject",
  "message": "Hello!",
  "company": "",
  "elapsedMs": 8421,
  "turnstileToken": ""
}
```

| Field | Required | Notes |
| --- | --- | --- |
| `name` | Yes | Max 100 characters |
| `email` | Yes | Max 254 characters, format validated |
| `type` | Yes | Must match a key in `DISCUSSION_IDS` |
| `subject` | No | Max 150 characters |
| `message` | Yes | 10–5000 characters |
| `company` | — | Honeypot. Must be empty |
| `elapsedMs` | No | Time on form. Under 2000 ms is rejected |
| `turnstileToken` | If enabled | Cloudflare Turnstile response token |

Responses: `200 {"success": true}` · `400` invalid input · `403` origin or
captcha rejected · `405` wrong method · `422` spam heuristics · `500`
misconfigured · `502` GitHub unavailable.

## Project structure

```text
public/          Static site — index.html, app.js, style.css, config.js
lib/             Platform-agnostic backend logic (start here)
api/             Vercel + Netlify entry point (thin re-export)
functions/api/   Cloudflare Pages entry point (thin re-export)
test/            Node test-runner suite
docs/            Setup, deployment and architecture guides
```

## Development

```bash
npm run dev           # Cloudflare Pages dev server
npm run dev:netlify   # Netlify dev server
npm run dev:vercel    # Vercel dev server
npm run lint          # ESLint
npm test              # Node's built-in test runner
```

## Roadmap

- [ ] File attachment support via GitHub's asset upload
- [ ] Optional email auto-reply to the submitter
- [ ] Slack / Discord notification workflow
- [ ] Drop-in embeddable widget (`<script>` tag, no page rebuild)
- [ ] Netlify / Vercel / Cloudflare one-click deploy buttons
- [ ] Multi-language form labels

Have an idea? [Open a feature request](https://github.com/Automationxperts/contact-form/issues/new/choose).

## Contributing

Contributions are welcome — see [CONTRIBUTING.md](CONTRIBUTING.md). Good first
issues are labelled [`good first issue`](https://github.com/Automationxperts/contact-form/labels/good%20first%20issue).

Found a security problem? Please follow [SECURITY.md](SECURITY.md) rather than
opening a public issue.

## License

[MIT](LICENSE) — use it, fork it, sell what you build with it. Attribution
appreciated but not required.
