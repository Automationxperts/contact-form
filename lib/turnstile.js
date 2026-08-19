/**
 * Optional Cloudflare Turnstile verification.
 *
 * Enabled by setting `TURNSTILE_SECRET_KEY` on the server and `turnstileSiteKey`
 * in `config.js` on the client. When the secret is absent this is a no-op, so
 * the project still works out of the box with only the honeypot + timing checks.
 */

import { ValidationError } from './validate.js';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export async function verifyTurnstile(token, config, remoteIp) {
  if (!config.turnstileSecret) return;

  if (!token || typeof token !== 'string') {
    throw new ValidationError('Captcha verification is required.', 403);
  }

  const form = new URLSearchParams({ secret: config.turnstileSecret, response: token });
  if (remoteIp) form.set('remoteip', remoteIp);

  const response = await fetch(VERIFY_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: form,
  });

  const result = await response.json().catch(() => ({ success: false }));
  if (!result.success) {
    throw new ValidationError('Captcha verification failed. Please try again.', 403);
  }
}
