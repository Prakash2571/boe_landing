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
        password: 'analytical-engine-1843',
        acceptedConsents: true,
      }),
    ).toEqual({
      fullName: 'Ada Lovelace',
      email: 'ada@example.com',
      phone: '+919876543210',
      password: 'analytical-engine-1843',
      acceptedConsents: true,
    });
  });

  it('defaults a missing password to empty rather than undefined', () => {
    // validateSignup then reports it as too short, which is the message a visitor
    // who skipped the field should see.
    expect(normalizeSignup({}).password).toBe('');
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
    password: 'analytical-engine-1843',
    confirmPassword: 'analytical-engine-1843',
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
    const result = validateSignup({
      fullName: '',
      email: 'nope',
      phone: '1',
      password: 'tiny',
      acceptedConsents: false,
    });
    expect(Object.keys(result.errors).sort()).toEqual([
      'acceptedConsents',
      'email',
      'fullName',
      'password',
      'phone',
    ]);
  });

  it.each([
    ['', 'empty'],
    ['short', 'five characters'],
    ['elevenchars', 'eleven characters, one under the minimum'],
    ['x'.repeat(129), 'over 128 characters'],
  ])('rejects the password %s (%s)', (password) => {
    const result = validateSignup({ ...valid, password, confirmPassword: password });
    expect(result.errors.password).toBeDefined();
  });

  it('accepts exactly 12 characters, the backend minimum', () => {
    const password = 'x'.repeat(12);
    const result = validateSignup({ ...valid, password, confirmPassword: password });
    expect(result.ok).toBe(true);
  });

  it('rejects control characters in the password, matching the backend', () => {
    const password = 'has\u0007a-bell-char';
    expect(validateSignup({ ...valid, password, confirmPassword: password }).errors.password).toBeDefined();
  });

  it('requires the re-entry to match', () => {
    const result = validateSignup({ ...valid, confirmPassword: 'analytical-engine-1844' });
    expect(result.ok).toBe(false);
    expect(result.errors.confirmPassword).toBeDefined();
  });

  it('accepts a body with no re-entry field at all', () => {
    // Regression: this is exactly what the route handler re-validates, because the
    // form posts the NORMALISED values and those exclude confirmPassword. Reading
    // the absent field as an empty string rejected every real signup with "Both
    // passwords must match".
    const { confirmPassword, ...withoutReentry } = valid;
    const result = validateSignup(withoutReentry);

    expect(result.ok).toBe(true);
    expect(result.errors.confirmPassword).toBeUndefined();
  });

  it('still rejects a supplied-but-empty re-entry', () => {
    // Absent is "not applicable"; empty is someone who skipped the second box.
    const result = validateSignup({ ...valid, confirmPassword: '' });
    expect(result.errors.confirmPassword).toBeDefined();
  });

  it('reports only the length problem when the password is both short and mismatched', () => {
    // One problem at a time: telling someone their password is too short AND
    // does not match is noise, since fixing the first invalidates the second.
    const result = validateSignup({ ...valid, password: 'tiny', confirmPassword: 'different' });
    expect(result.errors.password).toBeDefined();
    expect(result.errors.confirmPassword).toBeUndefined();
  });

  it('preserves the password exactly, including surrounding spaces', () => {
    // Trimming here would store a different secret than the one chosen, and the
    // person would then fail to sign in with the password they believe they set.
    const password = '  spaced password  ';
    const result = validateSignup({ ...valid, password, confirmPassword: password });
    expect(result.ok).toBe(true);
    expect(result.values.password).toBe(password);
  });

  it('does not carry the re-entry through to the normalised values', () => {
    // The backend schema is strict, so an extra field would be rejected upstream.
    const result = validateSignup(valid);
    expect(result.values).not.toHaveProperty('confirmPassword');
  });
});
