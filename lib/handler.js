/**
 * Platform-agnostic contact form backend.
 *
 * One core function (`submit`) plus thin adapters for each host. The adapters
 * are re-exported by `api/github-submit.js` (Vercel + Netlify) and
 * `functions/api/github-submit.js` (Cloudflare Pages).
 */

import { createAppAuth } from '@octokit/auth-app';

import { ConfigError, loadConfig } from './config.js';
import { corsHeaders, isOriginAllowed } from './cors.js';
import { verifyTurnstile } from './turnstile.js';
import { buildComment, ValidationError, validateSubmission } from './validate.js';

const GRAPHQL_ENDPOINT = 'https://api.github.com/graphql';

const ADD_COMMENT_MUTATION = `
  mutation AddComment($discussionId: ID!, $body: String!) {
    addDiscussionComment(input: { discussionId: $discussionId, body: $body }) {
      comment { id }
    }
  }
`;

/**
 * Runs the full submission pipeline.
 *
 * @param {object} payload  Parsed JSON request body.
 * @param {object} env      Raw environment bag (process.env or context.env).
 * @param {{remoteIp?: string}} [meta]
 * @returns {Promise<{success: true}>}
 */
export async function submit(payload, env, meta = {}) {
  const config = loadConfig(env);
  const submission = validateSubmission(payload, config);
  await verifyTurnstile(payload.turnstileToken, config, meta.remoteIp);

  const auth = createAppAuth({
    appId: config.appId,
    privateKey: config.privateKey,
    installationId: config.installationId,
  });
  const { token } = await auth({ type: 'installation' });

  const response = await fetch(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'User-Agent': config.userAgent,
    },
    body: JSON.stringify({
      query: ADD_COMMENT_MUTATION,
      variables: { discussionId: submission.discussionId, body: buildComment(submission) },
    }),
  });

  const result = await response.json().catch(() => null);
  if (!response.ok || !result || result.errors) {
    const detail = result?.errors?.[0]?.message || `GitHub responded with ${response.status}`;
    throw new UpstreamError(detail);
  }

  // The comment URL is intentionally NOT returned: exposing it would let anyone
  // walk back to the discussion thread and read other people's submissions.
  return { success: true };
}

/** Raised when GitHub rejects the request. Details are logged, never returned. */
class UpstreamError extends Error {}

/**
 * Maps an internal error onto a safe `{ status, body }` pair.
 * Only `ValidationError` messages reach the client.
 */
function toErrorResponse(error, config) {
  if (error instanceof ValidationError) {
    return { status: error.status || 400, body: { error: error.message } };
  }

  console.error('[contact-form]', error?.message || error);

  if (error instanceof ConfigError) {
    return { status: 500, body: { error: 'The contact form is not configured correctly.' } };
  }
  return {
    status: 502,
    body: { error: config?.debug ? String(error?.message || error) : 'Unable to deliver your message right now. Please try again later.' },
  };
}

/** Reads `ALLOWED_ORIGINS` without throwing when the rest of the config is broken. */
function safeOrigins(env) {
  try {
    return loadConfig(env).allowedOrigins;
  } catch {
    return String(env?.ALLOWED_ORIGINS || '')
      .split(',')
      .map((o) => o.trim().replace(/\/+$/, ''))
      .filter(Boolean);
  }
}

/* -------------------------------------------------------------------------- */
/* Vercel — Node.js serverless function (default export)                       */
/* -------------------------------------------------------------------------- */

export async function vercelHandler(req, res) {
  const env = process.env;
  const origins = safeOrigins(env);
  for (const [key, value] of Object.entries(corsHeaders(req.headers?.origin, origins))) {
    res.setHeader(key, value);
  }

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
  if (!isOriginAllowed(req.headers?.origin, origins)) {
    return res.status(403).json({ error: 'Origin not allowed.' });
  }

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
    return res.status(200).json(await submit(payload, env, { remoteIp: req.headers?.['x-forwarded-for'] }));
  } catch (error) {
    const { status, body } = toErrorResponse(error, { debug: env.DEBUG === 'true' });
    return res.status(status).json(body);
  }
}

/* -------------------------------------------------------------------------- */
/* Netlify — Lambda-compatible function (named `handler` export)               */
/* -------------------------------------------------------------------------- */

export async function netlifyHandler(event) {
  const env = process.env;
  const origin = event.headers?.origin || event.headers?.Origin;
  const origins = safeOrigins(env);
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(origin, origins) };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers };
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }
  if (!isOriginAllowed(origin, origins)) {
    return { statusCode: 403, headers, body: JSON.stringify({ error: 'Origin not allowed.' }) };
  }

  try {
    const payload = JSON.parse(event.body || '{}');
    const result = await submit(payload, env, { remoteIp: event.headers?.['x-nf-client-connection-ip'] });
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error) {
    const { status, body } = toErrorResponse(error, { debug: env.DEBUG === 'true' });
    return { statusCode: status, headers, body: JSON.stringify(body) };
  }
}

/* -------------------------------------------------------------------------- */
/* Cloudflare Pages Functions                                                  */
/* -------------------------------------------------------------------------- */

export async function onRequestPost({ request, env }) {
  const origin = request.headers.get('Origin');
  const origins = safeOrigins(env);
  const headers = { 'Content-Type': 'application/json', ...corsHeaders(origin, origins) };

  if (!isOriginAllowed(origin, origins)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed.' }), { status: 403, headers });
  }

  try {
    const payload = await request.json();
    const result = await submit(payload, env, { remoteIp: request.headers.get('CF-Connecting-IP') });
    return new Response(JSON.stringify(result), { status: 200, headers });
  } catch (error) {
    const { status, body } = toErrorResponse(error, { debug: env.DEBUG === 'true' });
    return new Response(JSON.stringify(body), { status, headers });
  }
}

export async function onRequestOptions({ request, env }) {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(request.headers.get('Origin'), safeOrigins(env)),
  });
}
