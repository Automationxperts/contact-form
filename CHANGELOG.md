# Changelog

All notable changes to this project are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and
this project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] - 2026-08-31

First release intended for general use. The project was relicensed under MIT and
restructured so anyone can deploy it for their own static site.

### Added

- Origin allow-listing via `ALLOWED_ORIGINS` (`lib/cors.js`).
- Spam protection: honeypot field, submission-timing heuristic and optional
  Cloudflare Turnstile verification (`TURNSTILE_SECRET_KEY`).
- Input validation and sanitisation: length caps, email format checking,
  control-character stripping and `@mention` / `#issue` neutralisation.
- Configurable form categories through `DISCUSSION_IDS` (JSON) or
  `DISCUSSION_ID_<TYPE>`, replacing the four hard-coded categories.
- `public/config.js` — a single, secret-free file for branding, categories,
  endpoint and Turnstile site key.
- Optional subject field, toggled from `config.js`.
- Test suite (`npm test`) covering configuration, validation and CORS.
- ESLint configuration and a CI workflow running lint, tests and `npm audit`.
- `.env.example`, `LICENSE`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`,
  `SECURITY.md`, issue and pull request templates, and Dependabot.
- Documentation: `docs/SETUP.md`, `docs/DEPLOY.md`, `docs/ARCHITECTURE.md`.
- Security headers for all three platforms (`public/_headers`, `netlify.toml`,
  `vercel.json`).

### Changed

- **Breaking:** static assets moved to `public/`, which is now the publish
  directory on all three platforms. Backend source is no longer served publicly.
- **Breaking:** the backend was extracted into `lib/`; `api/github-submit.js` and
  `functions/api/github-submit.js` are now thin re-exports, so the Cloudflare,
  Netlify and Vercel code paths can no longer drift apart.
- **Breaking:** the request field `body` was renamed `message`. The old name is
  still accepted.
- Comment format: header fields plus the message inside a dynamically sized code
  fence, so user input cannot forge the fields parsed downstream.
- The CSV export workflow now writes `data/submissions.csv` with a `CommentId`
  column, quoted values and masked email addresses.
- Frontend rewritten to be configuration-driven, with inline error messages
  replacing `alert()` and full keyboard/screen-reader support.
- Relicensed from "All rights reserved" to MIT.

### Fixed

- **Critical:** command injection in `.github/workflows/export-csv.yml`. The
  untrusted comment body was interpolated into a bash script in a job with
  `contents: write`. It is now read inside `actions/github-script`.
- **High:** CSV formula injection in the export workflow. Values are now quoted
  and guarded against a leading `=`, `+`, `-` or `@`.
- **High:** `Access-Control-Allow-Origin: *` allowed anyone to use the endpoint
  and exhaust the GitHub App rate limit.
- **Medium:** raw GitHub API errors were returned to the client, leaking
  configuration and upstream internals.
- **Medium:** the successful response returned the discussion comment URL,
  letting anyone reach the thread and read other people's submissions.
- **Medium:** email addresses were committed unmasked to a CSV in a public
  repository. They are now masked unless `EXPORT_INCLUDE_EMAIL` is set.
- Cloudflare Pages published the function source and `node_modules` as static
  assets because the output directory was the repository root.

### Removed

- Duplicated backend implementation in `functions/api/github-submit.js`.
- Hard-coded branding, personal domains and "All rights reserved" notices.
