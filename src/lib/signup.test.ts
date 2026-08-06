import { describe, expect, it } from 'vitest';

import { normalizePhone, normalizeSignup, validateSignup } from './signup';

// These rules exist to stop the app backend answering 400 for things a visitor
// typed reasonably. The phone cases are the ones that actually bite: the backend
// accepts E.164 only, and almost nobody types E.164.

describe('normalizePhone', () => {
  it.each([
    ['9876543210', '+919876543210', 'bare Indian national number'],
    ['09876543210', '+919876543210', 'with a trunk zero'],
    ['98765 43210', '+919876543210', 'with a space'],
    ['98765-43210', '+919876543210', 'with a dash'],
    ['+91 98765 43210', '+919876543210', 'already E.164, spaced'],
    ['+91(98765)43210', '+919876543210', 'already E.164, bracketed'],
    ['0091 9876543210', '+919876543210', 'international 00 prefix'],
    ['+1 415 555 1234', '+14155551234', 'a non-Indian number keeps its code'],
  ])('%s -> %s (%s)', (input, expected) => {
    expect(normalizePhone(input)).toBe(expected);
  });

  it('returns empty for empty input rather than inventing a country code', () => {
    expect(normalizePhone('')).toBe('');
    expect(normalizePhone('   ')).toBe('');
  });
});

describe('normalizeSignup', () => {
  it('trims, collapses inner whitespace in the name, and lowercases the email', () => {
    expect(
      normalizeSignup({
        fullName: '  Ada   Lovelace ',
        email: '  ADA@Example.COM ',
        phone: ' 9876543210 ',
        acceptedConsents: true,
      }),
    ).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+919876543210',
      acceptedConsents: true,
    });
  });

  it('treats a missing or non-true consent as not accepted', () => {
    expect(normalizeSignup({}).acceptedConsents).toBe(false);
    expect(normalizeSignup({ acceptedConsents: false }).acceptedConsents).toBe(false);
  });
});

describe('validateSignup', () => {
  const valid = {
    fullName: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '9876543210',
    acceptedConsents: true,
  };

  it('accepts a complete submission', () => {
    const result = validateSignup(valid);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
    expect(result.values.phone).toBe('+919876543210');
  });

  it('requires the consent box, because the app records a consent row per signup', () => {
    const result = validateSignup({ ...valid, acceptedConsents: false });
    expect(result.ok).toBe(false);
    expect(result.errors.acceptedConsents).toBeDefined();
  });

  it.each([
    ['', 'empty'],
    ['A', 'one character'],
    ['x'.repeat(121), 'over 120 characters'],
  ])('rejects a full name that is %s (%s)', (fullName) => {
    expect(validateSignup({ ...valid, fullName }).errors.fullName).toBeDefined();
  });

  it('counts code points, so a 120-emoji name is accepted and 121 is not', () => {
    expect(validateSignup({ ...valid, fullName: '😀'.repeat(120) }).errors.fullName).toBeUndefined();
    expect(validateSignup({ ...valid, fullName: '😀'.repeat(121) }).errors.fullName).toBeDefined();
  });

  it('rejects control characters in the name, matching the backend', () => {
    expect(validateSignup({ ...valid, fullName: 'Ada\u0007Lovelace' }).errors.fullName).toBeDefined();
  });

  it.each(['not-an-email', 'a@b', 'a b@example.com', ''])('rejects the email %s', (email) => {
    expect(validateSignup({ ...valid, email }).errors.email).toBeDefined();
  });

  it.each([
    ['12345', 'too short'],
    ['+0123456789', 'leading zero after +'],
    ['abcdefghij', 'not digits'],
    ['', 'empty'],
  ])('rejects the phone %s (%s)', (phone) => {
    expect(validateSignup({ ...valid, phone }).errors.phone).toBeDefined();
  });

  it('reports every bad field at once rather than one at a time', () => {
    const result = validateSignup({ fullName: '', email: 'nope', phone: '1', acceptedConsents: false });
    expect(Object.keys(result.errors).sort()).toEqual([
      'acceptedConsents',
      'email',
      'fullName',
      'phone',
    ]);
  });
});
