import { describe, expect, test } from 'vitest';

import { GET } from './route';

const call = (url: string, target: string) =>
  GET(new Request(url), { params: { target } });

describe('PhonePe checkout return', () => {
  test('forwards the dev target to the dev app dashboard', () => {
    const response = call('https://www.beonedge.in/pay/return/dev', 'dev');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://dev-app.beonedge.in/dashboard');
  });

  test('forwards the app target to the production app dashboard', () => {
    const response = call('https://www.beonedge.in/pay/return/app', 'app');

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://app.beonedge.in/dashboard');
  });

  test('carries through query parameters PhonePe appends', () => {
    const response = call(
      'https://www.beonedge.in/pay/return/dev?code=PAYMENT_SUCCESS&merchantOrderId=boe_1',
      'dev',
    );

    const location = new URL(response.headers.get('location') ?? '');
    expect(location.origin).toBe('https://dev-app.beonedge.in');
    expect(location.pathname).toBe('/dashboard');
    expect(location.searchParams.get('code')).toBe('PAYMENT_SUCCESS');
    expect(location.searchParams.get('merchantOrderId')).toBe('boe_1');
  });

  test('is never cached', () => {
    expect(call('https://www.beonedge.in/pay/return/dev', 'dev').headers.get('cache-control'))
      .toBe('no-store');
  });

  test('404s an unknown target instead of redirecting', () => {
    const response = call('https://www.beonedge.in/pay/return/evil', 'evil');

    expect(response.status).toBe(404);
    expect(response.headers.get('location')).toBeNull();
  });

  test('a query string cannot redirect the payer off our own hosts', () => {
    for (const hostile of [
      'https://www.beonedge.in/pay/return/dev?to=https://evil.test',
      'https://www.beonedge.in/pay/return/dev?redirect=//evil.test',
      'https://www.beonedge.in/pay/return/dev?next=https%3A%2F%2Fevil.test',
    ]) {
      const location = new URL(call(hostile, 'dev').headers.get('location') ?? '');
      expect(location.host).toBe('dev-app.beonedge.in');
    }
  });

  test('a hostile target key cannot traverse to another host', () => {
    for (const target of ['../app', 'dev/../../evil', 'https://evil.test', '']) {
      expect(call(`https://www.beonedge.in/pay/return/${target}`, target).status).toBe(404);
    }
  });
});
