import { afterEach, describe, expect, it, vi } from 'vitest';

import { serverEnv } from './env';

// NODE_ENV is typed readonly by Next's own ambient types, so assignments go
// through vi.stubEnv — which also restores the original value on cleanup.
afterEach(() => {
  process.env.BEO_API_BASE = undefined;
  vi.unstubAllEnvs();
});

describe('serverEnv.appApiBase', () => {
  it('accepts the canonical development API in production', () => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.BEO_API_BASE = 'https://dev-app.beonedge.in/api/';

    expect(serverEnv.appApiBase()).toBe('https://dev-app.beonedge.in/api');
  });

  it.each([
    'http://dev-app.beonedge.in/api',
    'https://example.com/api',
    'https://dev-app.beonedge.in/not-api',
    'https://user:password@dev-app.beonedge.in/api',
  ])('rejects unsafe production backend URL %s', (value) => {
    vi.stubEnv('NODE_ENV', 'production');
    process.env.BEO_API_BASE = value;

    expect(() => serverEnv.appApiBase()).toThrow(/BEO_API_BASE/u);
  });
});
