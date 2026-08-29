# Contributing

Thanks for taking the time to contribute. This project is small on purpose —
no build step, no framework, no bundler — so contributions should keep it that way.

## Getting started

```bash
git clone https://github.com/Automationxperts/contact-form.git
cd contact-form
npm install
cp .env.example .env.local   # then fill in your own values
npm run dev                  # Cloudflare Pages dev server on http://localhost:8788
```

Netlify and Vercel local development are also supported:

```bash
npm run dev:netlify
npm run dev:vercel
```

## Project layout

```
public/          Static site (index.html, app.js, style.css, config.js)
lib/             Platform-agnostic backend logic — start here
api/             Vercel + Netlify function entry point (thin re-export)
functions/api/   Cloudflare Pages function entry point (thin re-export)
docs/            Setup and deployment guides
```

**All backend logic belongs in `lib/`.** The files in `api/` and
`functions/api/` are deliberately just a few lines so the three platforms can
never drift apart.

## Before opening a pull request

```bash
npm run lint    # ESLint
npm test        # Node's built-in test runner
```

- Keep the no-build-step constraint: plain ES modules, no TypeScript, no bundler.
- Add a test in `test/` for any change to validation or sanitisation logic.
- Update `.env.example` and `docs/SETUP.md` when you add configuration.
- Use [Conventional Commits](https://www.conventionalcommits.org/) for commit
  messages (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).

## Reporting bugs

Open an issue using the bug report template. If the bug is a security
vulnerability, follow [SECURITY.md](SECURITY.md) instead — do not open a public issue.

## Code of conduct

Participation is governed by the [Code of Conduct](CODE_OF_CONDUCT.md).
