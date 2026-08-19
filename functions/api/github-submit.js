/**
 * Cloudflare Pages Function entry point.
 *
 * The file path maps directly to the route: `/api/github-submit`.
 * Requires `nodejs_compat` (see wrangler.toml) for `@octokit/auth-app`.
 */

export { onRequestOptions, onRequestPost } from '../../lib/handler.js';
