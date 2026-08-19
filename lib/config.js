/**
 * Runtime configuration resolver.
 *
 * Every deployment target exposes environment variables differently:
 *   - Vercel / Netlify  -> process.env
 *   - Cloudflare Pages  -> context.env
 *
 * This module normalises whatever object it is handed into a single,
 * validated config shape so the rest of the codebase never touches env
 * variables directly.
 */

/** Field length limits. Keep these conservative: GitHub comments cap at 65536. */
export const LIMITS = {
  name: 100,
  email: 254,
  subject: 150,
  message: 5000,
  type: 40,
};

/** Minimum milliseconds a human is expected to spend filling the form. */
export const MIN_FILL_TIME_MS = 2000;

const LEGACY_ID_KEYS = {
  general: 'ID_GENERAL',
  feature: 'ID_FEATURE',
  bug: 'ID_BUG',
  feedback: 'ID_FEEDBACK',
};

/**
 * Builds the `type -> discussion node id` map.
 *
 * Supported (in priority order):
 *   1. DISCUSSION_IDS       - JSON object, e.g. {"general":"D_kwDO...","bug":"D_kwDO..."}
 *   2. DISCUSSION_ID_<TYPE> - one variable per category, e.g. DISCUSSION_ID_GENERAL
 *   3. ID_<TYPE>            - legacy names kept for existing deployments
 */
function resolveDiscussionMap(env) {
  const map = {};

  if (env.DISCUSSION_IDS) {
    let parsed;
    try {
      parsed = JSON.parse(env.DISCUSSION_IDS);
    } catch {
      throw new ConfigError('DISCUSSION_IDS is not valid JSON.');
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new ConfigError('DISCUSSION_IDS must be a JSON object.');
    }
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value) map[normaliseType(key)] = value;
    }
  }

  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('DISCUSSION_ID_') || typeof value !== 'string' || !value) continue;
    map[normaliseType(key.slice('DISCUSSION_ID_'.length))] = value;
  }

  for (const [type, key] of Object.entries(LEGACY_ID_KEYS)) {
    if (!map[type] && env[key]) map[type] = env[key];
  }

  return map;
}

/** Category keys are matched case-insensitively and are always kebab-cased. */
export function normaliseType(value) {
  return String(value).trim().toLowerCase().replace(/[\s_]+/g, '-');
}

/** Thrown when the deployment is misconfigured; never surfaced to end users. */
export class ConfigError extends Error {}

function parseOrigins(raw) {
  return String(raw || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}

export function loadConfig(env = {}) {
  const missing = ['GH_APP_ID', 'GH_PRIVATE_KEY', 'GH_INSTALLATION_ID'].filter((key) => !env[key]);
  if (missing.length) {
    throw new ConfigError(`Missing required environment variables: ${missing.join(', ')}`);
  }

  const discussionIds = resolveDiscussionMap(env);
  if (!Object.keys(discussionIds).length) {
    throw new ConfigError('No discussion IDs configured. Set DISCUSSION_IDS or DISCUSSION_ID_<TYPE>.');
  }

  return {
    appId: env.GH_APP_ID,
    // Secret managers frequently store PEM newlines as the literal characters "\n".
    privateKey: String(env.GH_PRIVATE_KEY).replace(/\\n/g, '\n'),
    installationId: env.GH_INSTALLATION_ID,
    discussionIds,
    allowedOrigins: parseOrigins(env.ALLOWED_ORIGINS),
    turnstileSecret: env.TURNSTILE_SECRET_KEY || '',
    userAgent: env.USER_AGENT || 'gitconnect-contact-form',
    debug: String(env.DEBUG || '').toLowerCase() === 'true',
  };
}
