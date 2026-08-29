import { describe, expect, it } from 'vitest';

import { decidePayRedirect, signPayRedirect } from './payRedirect';

const SECRET = '0123456789abcdef0123456789abcdef0123456789abcdef';
const NOW = 1_800_000_000_000;
const TARGET = 'https://mercury-t2.phonepe.com/transact/pgv3?token=abc';

const encode = (value: string): string => Buffer.from(value, 'utf8').toString('base64url');

const link = (overrides: Partial<{ target: string; expiry: string; signature: string; now: number }> = {}) => {
  const encodedTarget = encode(overrides.target ?? TARGET);
  const expiry = overrides.expiry ?? String(NOW + 900_000);
  return {
    secret: SECRET,
    encodedTarget,
    expiry,
    signature: overrides.signature ?? signPayRedirect(SECRET, encodedTarget, expiry),
    now: overrides.now ?? NOW,
  };
};

describe('signed pay redirect', () => {
  it('accepts a correctly signed, unexpired provider URL', () => {
    expect(decidePayRedirect(link())).toStrictEqual({ ok: true, target: TARGET });
  });

  it('refuses a missing parameter', () => {
    expect(decidePayRedirect({ ...link(), signature: null }).ok).toBe(false);
    expect(decidePayRedirect({ ...link(), expiry: null }).ok).toBe(false);
    expect(decidePayRedirect({ ...link(), encodedTarget: null }).ok).toBe(false);
  });

  it('refuses a tampered target, which is what stops this being an open redirect', () => {
    const base = link();
    const swapped = { ...base, encodedTarget: encode('https://evil.test/steal') };

    expect(decidePayRedirect(swapped)).toStrictEqual({ ok: false, reason: 'bad-signature' });
  });

  it('refuses a validly signed URL on a host that is not the provider', () => {
    const forged = link({ target: 'https://evil.test/steal' });

    expect(decidePayRedirect(forged)).toStrictEqual({ ok: false, reason: 'host-not-allowed' });
  });

  it('refuses a signature made with another secret', () => {
    const base = link();
    expect(decidePayRedirect({
      ...base,
      signature: signPayRedirect('f'.repeat(48), base.encodedTarget, base.expiry),
    })).toStrictEqual({ ok: false, reason: 'bad-signature' });
  });

  it('refuses an expired link', () => {
    expect(decidePayRedirect(link({ expiry: String(NOW - 1) })))
      .toStrictEqual({ ok: false, reason: 'expired' });
  });

  it('refuses a non-numeric expiry', () => {
    const encodedTarget = encode(TARGET);
    expect(decidePayRedirect({
      secret: SECRET,
      encodedTarget,
      expiry: 'soon',
      signature: signPayRedirect(SECRET, encodedTarget, 'soon'),
      now: NOW,
    })).toStrictEqual({ ok: false, reason: 'expired' });
  });

  it('refuses cleartext and embedded credentials even on an allowed host', () => {
    expect(decidePayRedirect(link({ target: 'http://mercury-t2.phonepe.com/x' })))
      .toStrictEqual({ ok: false, reason: 'malformed-target' });
    expect(decidePayRedirect(link({ target: 'https://u:p@mercury-t2.phonepe.com/x' })))
      .toStrictEqual({ ok: false, reason: 'malformed-target' });
  });

  it('refuses a target that is not a URL at all', () => {
    expect(decidePayRedirect(link({ target: 'not-a-url' })))
      .toStrictEqual({ ok: false, reason: 'malformed-target' });
  });

  it('accepts every provider host we may be redirected to', () => {
    for (const host of ['mercury.phonepe.com', 'mercury-t2.phonepe.com', 'mercury-uat.phonepe.com']) {
      expect(decidePayRedirect(link({ target: `https://${host}/transact?token=t` })).ok).toBe(true);
    }
  });

  it('preserves the provider query string exactly', () => {
    const target = 'https://mercury-t2.phonepe.com/transact/pgv3?token=a%2Fb%2Bc&routingKey=W';
    const decision = decidePayRedirect(link({ target }));

    expect(decision.ok).toBe(true);
    if (decision.ok) expect(decision.target).toBe(target);
  });
});
