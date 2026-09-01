# Setup guide

This walks you from zero to a working contact form. Budget about 15 minutes.

- [1. Choose a backend repository](#1-choose-a-backend-repository)
- [2. Create the Discussions](#2-create-the-discussions)
- [3. Create a GitHub App](#3-create-a-github-app)
- [4. Collect the Discussion node IDs](#4-collect-the-discussion-node-ids)
- [5. Configure the frontend](#5-configure-the-frontend)
- [6. Deploy](#6-deploy)
- [7. Verify](#7-verify)
- [Troubleshooting](#troubleshooting)

---

## 1. Choose a backend repository

Submissions are stored as comments on GitHub Discussions. Pick the repository
that will hold them.

> **Make it private** if submissions will contain personal data. Anyone who can
> read the repository can read every submission. It does **not** have to be the
> same repository as your website.

Enable Discussions: **Repository → Settings → General → Features → Discussions**.

## 2. Create the Discussions

Create one discussion thread per form category. With the default
[public/config.js](../public/config.js) that means four:

| Thread title | Category value |
| --- | --- |
| General Inquiries | `general` |
| Feature Requests | `feature` |
| Bug Reports | `bug` |
| Feedback | `feedback` |

Want different categories? Edit the `categories` array in `public/config.js` and
create matching threads. The `value` is what links the two together.

## 3. Create a GitHub App

A GitHub App is used instead of a personal access token so the credential is
scoped to a single repository and can be revoked independently.

1. Go to **Settings → Developer settings → GitHub Apps → New GitHub App**.
2. **Name:** anything unique, e.g. `my-site-contact-form`.
3. **Homepage URL:** your site.
4. **Webhook:** untick *Active*. This app never receives webhooks.
5. **Repository permissions:** set **Discussions** to **Read & write**. Leave
   every other permission at *No access*.
6. **Where can this app be installed:** *Only on this account*.
7. Click **Create GitHub App**.

Then, on the app's page:

- Note the **App ID** → `GH_APP_ID`.
- Scroll to **Private keys → Generate a private key**. A `.pem` file downloads.
  Its contents become `GH_PRIVATE_KEY`. Treat it like a password.
- Click **Install App**, choose **Only select repositories** and pick your
  backend repository. After installing, the browser URL is
  `https://github.com/settings/installations/<id>` — that `<id>` is
  `GH_INSTALLATION_ID`.

### Formatting the private key

Most hosting dashboards accept multi-line values — paste the `.pem` file as-is.
If yours does not, convert the newlines to the literal two characters `\n`:

```bash
# macOS / Linux
awk 'BEGIN{ORS="\\n"} {print}' your-key.pem
```

```powershell
# Windows PowerShell
(Get-Content your-key.pem -Raw) -replace "`r`n", "\n" -replace "`n", "\n"
```

The backend accepts either form.

## 4. Collect the Discussion node IDs

Each thread has a GraphQL node ID starting with `D_kwDO`. Query them once with
the [GitHub GraphQL Explorer](https://docs.github.com/en/graphql/overview/explorer):

```graphql
{
  repository(owner: "YOUR_USERNAME", name: "YOUR_BACKEND_REPO") {
    discussions(first: 20) {
      nodes { number title id }
    }
  }
}
```

Or from the terminal with the GitHub CLI:

```bash
gh api graphql -f query='
{
  repository(owner: "YOUR_USERNAME", name: "YOUR_BACKEND_REPO") {
    discussions(first: 20) { nodes { number title id } }
  }
}'
```

Build the `DISCUSSION_IDS` value by pairing each category with its node ID:

```json
{"general":"D_kwDO...","feature":"D_kwDO...","bug":"D_kwDO...","feedback":"D_kwDO..."}
```

Node IDs are not secrets — they are useless without the App's private key — but
keeping them in environment variables lets you reuse one codebase across sites.

## 5. Configure the frontend

Edit [public/config.js](../public/config.js). It contains no secrets and is the
only file most people need to touch:

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

## 6. Deploy

See [DEPLOY.md](DEPLOY.md) for platform-specific steps. In all cases you set
these environment variables:

| Variable | Required | Purpose |
| --- | --- | --- |
| `GH_APP_ID` | Yes | GitHub App ID |
| `GH_PRIVATE_KEY` | Yes | Contents of the `.pem` file — store as a **secret** |
| `GH_INSTALLATION_ID` | Yes | Installation ID from the install URL |
| `DISCUSSION_IDS` | Yes* | JSON map of category → discussion node ID |
| `DISCUSSION_ID_<TYPE>` | Yes* | Alternative: one variable per category |
| `ALLOWED_ORIGINS` | Recommended | Comma-separated origins allowed to POST |
| `TURNSTILE_SECRET_KEY` | No | Enables Cloudflare Turnstile verification |
| `USER_AGENT` | No | User-Agent sent to the GitHub API |
| `DEBUG` | No | `true` returns upstream error details. Local use only |

\* Provide either `DISCUSSION_IDS` **or** one `DISCUSSION_ID_<TYPE>` per category.

## 7. Verify

Submit a test message. A successful request returns:

```json
{ "success": true }
```

The comment URL is deliberately **not** returned — exposing it would let anyone
walk back to the thread and read other people's submissions.

Check the discussion thread for a new comment from your app's bot account.

---

## Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `The contact form is not configured correctly.` | A required environment variable is missing or `DISCUSSION_IDS` is not valid JSON | Check the function logs — the exact missing variable is logged server-side |
| `Unknown inquiry type.` | A `value` in `config.js` has no matching key in `DISCUSSION_IDS` | Make the keys match exactly (lower-case) |
| `Origin not allowed.` | The requesting origin is not in `ALLOWED_ORIGINS` | Add the origin, including the scheme and without a trailing slash |
| `Unable to deliver your message right now.` | GitHub rejected the call | Usually a bad private key, wrong installation ID, or the App lacks `Discussions: Read & write`. Set `DEBUG=true` locally to see the upstream message |
| `error: Could not resolve "node:crypto"` on Cloudflare | `nodejs_compat` is not enabled | Add the `nodejs_compat` compatibility flag in the Pages dashboard **and** keep it in `wrangler.toml` |
| Submissions silently rejected with 422 | The honeypot or timing check fired | Ensure the hidden `company` input is empty and the form is not auto-filled instantly |
| CSV export workflow does nothing | The comment was not authored by the App bot | The workflow intentionally ignores human-written comments |
