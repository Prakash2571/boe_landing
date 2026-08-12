import { afterEach, describe, expect, it } from 'vitest';

import { serverEnv } from './env';

const originalNodeEnv = process.env.NODE_ENV;

afterEach(() => {
  process.env.BEO_API_BASE = undefined;
  process.env.NODE_ENV = originalNodeEnv;
});

describe('serverEnv.appApiBase', () => {
  it('accepts the canonical development API in production', () => {
    process.env.NODE_ENV = 'production';
    process.env.BEO_API_BASE = 'https://dev-app.beonedge.in/api/';

    expect(serverEnv.appApiBase()).toBe('https://dev-app.beonedge.in/api');
  });

  it.each([
    'http://dev-app.beonedge.in/api',
    'https://example.com/api',
    'https://dev-app.beonedge.in/not-api',
    'https://user:password@dev-app.beonedge.in/api',
  ])('rejects unsafe production backend URL %s', (value) => {
    process.env.NODE_ENV = 'production';
    process.env.BEO_API_BASE = value;

    expect(() => serverEnv.appApiBase()).toThrow(/BEO_API_BASE/u);
  });
});
