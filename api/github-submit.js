/**
 * Vercel (`export default`) and Netlify (`export const handler`) entry point.
 *
 * All logic lives in `lib/` so the three supported platforms stay in sync.
 * Cloudflare Pages uses `functions/api/github-submit.js` instead.
 */

import { netlifyHandler, vercelHandler } from '../lib/handler.js';

export default vercelHandler;

export const handler = netlifyHandler;
