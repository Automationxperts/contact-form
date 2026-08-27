import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { corsHeaders, isOriginAllowed } from '../lib/cors.js';

const ALLOWED = ['https://example.com'];

describe('corsHeaders', () => {
  it('omits Allow-Origin when no allow-list is configured', () => {
    assert.equal(corsHeaders('https://evil.test', [])['Access-Control-Allow-Origin'], undefined);
  });

  it('echoes an allow-listed origin', () => {
    assert.equal(
      corsHeaders('https://example.com', ALLOWED)['Access-Control-Allow-Origin'],
      'https://example.com',
    );
  });

  it('ignores a trailing slash on the request origin', () => {
    assert.equal(
      corsHeaders('https://example.com/', ALLOWED)['Access-Control-Allow-Origin'],
      'https://example.com',
    );
  });

  it('omits Allow-Origin for a non-allow-listed origin', () => {
    assert.equal(corsHeaders('https://evil.test', ALLOWED)['Access-Control-Allow-Origin'], undefined);
  });

  it('supports an explicit wildcard', () => {
    assert.equal(corsHeaders('https://any.test', ['*'])['Access-Control-Allow-Origin'], '*');
  });

  it('always sets Vary: Origin so responses cache correctly', () => {
    assert.equal(corsHeaders('https://example.com', ALLOWED).Vary, 'Origin');
  });
});

describe('isOriginAllowed', () => {
  it('allows requests without an Origin header', () => {
    assert.equal(isOriginAllowed(undefined, ALLOWED), true);
  });

  it('allows anything when no allow-list is configured', () => {
    assert.equal(isOriginAllowed('https://evil.test', []), true);
  });

  it('blocks an origin outside the allow-list', () => {
    assert.equal(isOriginAllowed('https://evil.test', ALLOWED), false);
  });

  it('allows an origin inside the allow-list', () => {
    assert.equal(isOriginAllowed('https://example.com', ALLOWED), true);
  });
});
