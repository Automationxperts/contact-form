import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { loadConfig, ConfigError } from '../lib/config.js';
import { buildComment, validateSubmission, ValidationError } from '../lib/validate.js';

const BASE_ENV = {
  GH_APP_ID: '1',
  GH_PRIVATE_KEY: 'key',
  GH_INSTALLATION_ID: '2',
  DISCUSSION_IDS: '{"general":"D_1","bug":"D_2"}',
};

const config = loadConfig(BASE_ENV);

const valid = () => ({
  name: 'Ada Lovelace',
  email: 'ada@example.com',
  type: 'general',
  message: 'Hello, I would like to know more about this project.',
  elapsedMs: 9000,
});

describe('loadConfig', () => {
  it('reads the JSON discussion map', () => {
    assert.deepEqual(config.discussionIds, { general: 'D_1', bug: 'D_2' });
  });

  it('supports per-category variables', () => {
    const c = loadConfig({ ...BASE_ENV, DISCUSSION_IDS: undefined, DISCUSSION_ID_FEATURE: 'D_9' });
    assert.equal(c.discussionIds.feature, 'D_9');
  });

  it('supports the legacy ID_* names', () => {
    const c = loadConfig({ ...BASE_ENV, DISCUSSION_IDS: undefined, ID_FEEDBACK: 'D_7' });
    assert.equal(c.discussionIds.feedback, 'D_7');
  });

  it('restores newlines in a single-line private key', () => {
    const c = loadConfig({ ...BASE_ENV, GH_PRIVATE_KEY: 'a\\nb' });
    assert.equal(c.privateKey, 'a\nb');
  });

  it('rejects a missing private key', () => {
    assert.throws(() => loadConfig({ ...BASE_ENV, GH_PRIVATE_KEY: '' }), ConfigError);
  });

  it('rejects an empty discussion map', () => {
    assert.throws(() => loadConfig({ ...BASE_ENV, DISCUSSION_IDS: '{}' }), ConfigError);
  });

  it('parses ALLOWED_ORIGINS and strips trailing slashes', () => {
    const c = loadConfig({ ...BASE_ENV, ALLOWED_ORIGINS: 'https://a.dev/, https://b.dev' });
    assert.deepEqual(c.allowedOrigins, ['https://a.dev', 'https://b.dev']);
  });
});

describe('validateSubmission', () => {
  it('accepts a well-formed submission', () => {
    const result = validateSubmission(valid(), config);
    assert.equal(result.discussionId, 'D_1');
    assert.equal(result.email, 'ada@example.com');
  });

  it('matches the category case-insensitively', () => {
    assert.equal(validateSubmission({ ...valid(), type: 'GENERAL' }, config).discussionId, 'D_1');
  });

  it('still accepts the legacy `body` field name', () => {
    const payload = { ...valid(), message: undefined, body: 'A legacy message field value.' };
    assert.equal(validateSubmission(payload, config).message, 'A legacy message field value.');
  });

  it('rejects an unknown category', () => {
    assert.throws(() => validateSubmission({ ...valid(), type: 'nope' }, config), ValidationError);
  });

  it('rejects an invalid email', () => {
    assert.throws(() => validateSubmission({ ...valid(), email: 'ada@example' }, config), ValidationError);
  });

  it('rejects a short message', () => {
    assert.throws(() => validateSubmission({ ...valid(), message: 'hi' }, config), ValidationError);
  });

  it('rejects a filled honeypot', () => {
    assert.throws(() => validateSubmission({ ...valid(), company: 'Acme' }, config), ValidationError);
  });

  it('rejects an instant submission', () => {
    assert.throws(() => validateSubmission({ ...valid(), elapsedMs: 10 }, config), ValidationError);
  });

  it('allows a missing elapsedMs', () => {
    const payload = { ...valid(), elapsedMs: undefined };
    assert.equal(validateSubmission(payload, config).name, 'Ada Lovelace');
  });

  it('truncates oversized input', () => {
    const payload = { ...valid(), message: 'x'.repeat(10_000) };
    assert.equal(validateSubmission(payload, config).message.length, 5000);
  });

  it('strips control characters', () => {
    const payload = { ...valid(), name: 'Ada\u0000\u001b[31m' };
    assert.equal(validateSubmission(payload, config).name, 'Ada[31m');
  });

  it('rejects a non-object body', () => {
    assert.throws(() => validateSubmission('nope', config), ValidationError);
    assert.throws(() => validateSubmission([], config), ValidationError);
  });
});

describe('buildComment', () => {
  it('renders parseable header fields', () => {
    const comment = buildComment(validateSubmission(valid(), config));
    assert.match(comment, /^\*\*Name:\*\* Ada Lovelace$/m);
    assert.match(comment, /^\*\*Email:\*\* ada@example\.com$/m);
    assert.match(comment, /^\*\*Type:\*\* general$/m);
  });

  it('neutralises @mentions and issue references in the name', () => {
    const payload = { ...valid(), name: '@octocat #1' };
    const comment = buildComment(validateSubmission(payload, config));
    assert.match(comment, /`@octocat`/);
    assert.match(comment, /`#1`/);
    assert.doesNotMatch(comment, /\*\*Name:\*\* @octocat/);
  });

  it('prevents the message from escaping its code fence', () => {
    const payload = { ...valid(), message: '```\n**Name:** Attacker\n```' };
    const comment = buildComment(validateSubmission(payload, config));
    assert.match(comment, /^\*\*Name:\*\* Ada Lovelace$/m);
    assert.match(comment, /````/);
  });

  it('leaves the message body verbatim inside the fence', () => {
    const payload = { ...valid(), message: 'Please email me at ada@example.com.' };
    const comment = buildComment(validateSubmission(payload, config));
    assert.ok(comment.includes('Please email me at ada@example.com.'));
  });
});
