/**
 * Input validation and sanitisation.
 *
 * Everything here runs on untrusted, publicly submitted data. The output of
 * `buildComment` is committed to a GitHub Discussion in a public repository and
 * is later parsed by a GitHub Actions workflow, so it must be safe both as
 * Markdown and as workflow input.
 */

import { LIMITS, MIN_FILL_TIME_MS, normaliseType } from './config.js';

/** Thrown for bad user input. The message IS shown to the end user. */
export class ValidationError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

// Deliberately permissive: strict RFC 5322 matching rejects valid addresses.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@.]+(\.[^\s@.]+)+$/;

// C0/C1 control characters except tab (\x09) and newline (\x0A).
// eslint-disable-next-line no-control-regex -- matching control characters is the point
const CONTROL_CHARS = /[\x00-\x08\x0B-\x1F\x7F-\x9F]/g;

function clean(value, max) {
  return String(value ?? '')
    .replace(/\r\n/g, '\n')
    .replace(CONTROL_CHARS, '')
    .trim()
    .slice(0, max);
}

/**
 * Neutralises GitHub's auto-linking syntax so a submitter cannot notify
 * arbitrary users/teams (`@org/team`) or cross-link issues (`#123`, `GH-1`).
 * Wrapping in backticks keeps the text readable while killing the reference.
 */
function neutraliseReferences(text) {
  return text
    .replace(/(^|[^\w`])@([\w][\w-]*(?:\/[\w][\w-]*)?)/g, '$1`@$2`')
    .replace(/(^|[^\w`])#(\d+)/g, '$1`#$2`')
    .replace(/(^|[^\w`])(GH-\d+)/gi, '$1`$2`');
}

/**
 * Validates the raw request body.
 *
 * @param {object} payload   Parsed JSON request body.
 * @param {object} config    Result of `loadConfig`.
 * @returns {{name: string, email: string, type: string, subject: string, message: string, discussionId: string}}
 */
export function validateSubmission(payload, config) {
  if (payload === null || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new ValidationError('Malformed request body.');
  }

  // Honeypot: a hidden field that only automated scripts fill in.
  if (clean(payload.company, 200)) {
    throw new ValidationError('Submission rejected.', 422);
  }

  // Timing check: bots submit instantly.
  const elapsed = Number(payload.elapsedMs);
  if (Number.isFinite(elapsed) && elapsed >= 0 && elapsed < MIN_FILL_TIME_MS) {
    throw new ValidationError('Submission rejected.', 422);
  }

  const name = clean(payload.name, LIMITS.name);
  const email = clean(payload.email, LIMITS.email);
  const subject = clean(payload.subject, LIMITS.subject);
  const message = clean(payload.message ?? payload.body, LIMITS.message);
  const type = normaliseType(clean(payload.type, LIMITS.type));

  if (!name) throw new ValidationError('Name is required.');
  if (!EMAIL_PATTERN.test(email)) throw new ValidationError('A valid email address is required.');
  if (message.length < 10) throw new ValidationError('Message must be at least 10 characters.');

  const discussionId = config.discussionIds[type];
  if (!discussionId) throw new ValidationError('Unknown inquiry type.');

  return { name, email, type, subject, message, discussionId };
}

/**
 * Renders the Discussion comment.
 *
 * The layout is a stable contract with `.github/workflows/export-csv.yml`:
 * single-line `**Key:** value` header fields, then the message inside a fenced
 * block so that user text can never forge a header field.
 */
export function buildComment(submission) {
  const { name, email, type, subject, message } = submission;
  const header = [
    `**Name:** ${neutraliseReferences(name)}`,
    `**Email:** ${email}`,
    `**Type:** ${type}`,
    subject ? `**Subject:** ${neutraliseReferences(subject)}` : null,
    `**Submitted:** ${new Date().toISOString()}`,
  ].filter(Boolean);

  // Pick a fence longer than any backtick run in the message so it cannot escape.
  const longestRun = (message.match(/`+/g) || ['']).reduce((a, b) => (b.length > a.length ? b : a), '');
  const fence = '`'.repeat(Math.max(3, longestRun.length + 1));

  return `${header.join('\n')}\n\n**Message:**\n\n${fence}\n${message}\n${fence}`;
}
