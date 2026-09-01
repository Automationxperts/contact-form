# Deployment

The same codebase runs unchanged on three platforms. Pick one — all three have a
free tier that comfortably covers a contact form.

| | Cloudflare Pages | Netlify | Vercel |
| --- | --- | --- | --- |
| Publish directory | `public` | `public` | `public` |
| Function directory | `functions/` | `api/` | `api/` |
| Config file | `wrangler.toml` | `netlify.toml` | `vercel.json` |
| Extra setup | `nodejs_compat` flag | none | none |

Complete [SETUP.md](SETUP.md) first — you need the GitHub App credentials before
any of this works.

---

## Cloudflare Pages

**Recommended.** Generous free tier and the same platform as Turnstile.

### Via the dashboard

1. **Workers & Pages → Create → Pages → Connect to Git**, select your fork.
2. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: `public`
3. **Settings → Functions → Compatibility flags**: add `nodejs_compat` to both
   Production and Preview. Without it `@octokit/auth-app` cannot load `node:crypto`.
4. **Settings → Environment variables**: add the variables from
   [SETUP.md](SETUP.md#6-deploy). Use **Encrypt** for `GH_PRIVATE_KEY`.
5. Redeploy.

### Via the CLI

```bash
npm install
npx wrangler pages secret put GH_PRIVATE_KEY
npx wrangler pages secret put GH_APP_ID
npx wrangler pages secret put GH_INSTALLATION_ID
npx wrangler pages secret put DISCUSSION_IDS
npm run deploy
```

### Local development

```bash
cp .env.example .env.local
npm run dev          # http://localhost:8788
```

`wrangler pages dev` reads `.env.local` automatically.

---

## Netlify

1. **Add new site → Import an existing project**, select your fork.
2. Build settings are read from `netlify.toml`; leave the build command empty.
3. **Site configuration → Environment variables**: add the variables from
   [SETUP.md](SETUP.md#6-deploy).
4. Deploy.

`netlify.toml` already sets `functions = "api"`, the `/api/github-submit`
redirect, and `included_files = ["lib/**"]` so the shared backend is bundled.

```bash
npm install -g netlify-cli
npm run dev:netlify   # http://localhost:8888
```

---

## Vercel

1. **Add New → Project**, select your fork.
2. Framework preset: **Other**. `vercel.json` sets the output directory.
3. **Settings → Environment Variables**: add the variables from
   [SETUP.md](SETUP.md#6-deploy). Mark `GH_PRIVATE_KEY` as sensitive.
4. Deploy.

```bash
npm install -g vercel
npm run dev:vercel    # http://localhost:3000
```

---

## Using the form on a different domain

If your website and the function are on different origins — for example a GitHub
Pages site calling a Cloudflare Pages function:

1. Set `endpoint` in `public/config.js` to the absolute function URL:
   ```js
   endpoint: 'https://forms.example.workers.dev/api/github-submit',
   ```
2. Set `ALLOWED_ORIGINS` on the function to your website's origin:
   ```
   ALLOWED_ORIGINS=https://example.com,https://www.example.com
   ```

Origins must include the scheme and no trailing slash. Requests from any other
origin receive `403 Origin not allowed.`

---

## Hardening a public deployment

1. **Enable Turnstile.** Create a widget at
   [Cloudflare Turnstile](https://dash.cloudflare.com/?to=/:account/turnstile),
   put the site key in `public/config.js` and the secret key in
   `TURNSTILE_SECRET_KEY`. The widget renders automatically once the site key is set.
2. **Add rate limiting at the edge.** Serverless functions have no shared state,
   so use your host's controls: Cloudflare WAF rate-limiting rules, Netlify's
   firewall traffic rules, or Vercel's firewall.
3. **Lock down CORS** with `ALLOWED_ORIGINS`. Never ship `*`.
4. **Keep the backend repository private** if submissions contain personal data.
