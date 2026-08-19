/**
 * Origin allow-listing.
 *
 * A wide-open `Access-Control-Allow-Origin: *` lets anyone embed your endpoint
 * in their own site and burn your GitHub App rate limit, so an explicit
 * allow-list is the default. Set `ALLOWED_ORIGINS=*` only for local testing.
 */

const BASE_HEADERS = {
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};

/**
 * @param {string|undefined} origin  The request's `Origin` header.
 * @param {string[]} allowedOrigins  Values from `ALLOWED_ORIGINS`.
 * @returns {Record<string, string>} Headers to merge into the response.
 */
export function corsHeaders(origin, allowedOrigins = []) {
  // No allow-list configured: same-origin only, which is the common case when
  // the form and the function are deployed together.
  if (!allowedOrigins.length) return { ...BASE_HEADERS };

  if (allowedOrigins.includes('*')) {
    return { ...BASE_HEADERS, 'Access-Control-Allow-Origin': '*' };
  }

  const normalised = String(origin || '').replace(/\/+$/, '');
  if (normalised && allowedOrigins.includes(normalised)) {
    return { ...BASE_HEADERS, 'Access-Control-Allow-Origin': normalised };
  }

  return { ...BASE_HEADERS };
}

/**
 * Rejects cross-origin POSTs from origins that are not allow-listed.
 * Requests without an `Origin` header (curl, server-to-server) are allowed.
 */
export function isOriginAllowed(origin, allowedOrigins = []) {
  if (!origin) return true;
  if (!allowedOrigins.length) return true;
  if (allowedOrigins.includes('*')) return true;
  return allowedOrigins.includes(String(origin).replace(/\/+$/, ''));
}
