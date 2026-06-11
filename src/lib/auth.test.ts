import { describe, expect, test } from 'vitest';
import { normalizeSignup, validateLogin, validateSignup } from './auth';

describe('normalizeSignup', () => {
  test('trims fields, lowercases username and email, and preserves passwords', () => {
    expect(normalizeSignup({
      name: '  Asha  ',
      username: '  Asha_Client ',
      email: ' ASHA@Example.COM ',
      mobile: ' +91 98765 43210 ',
      password: ' Password123 ',
      confirmPassword: ' Password123 ',
    })).toEqual({
      name: 'Asha',
      username: 'asha_client',
      email: 'asha@example.com',
      mobile: '+91 98765 43210',
      password: ' Password123 ',
      confirmPassword: ' Password123 ',
    });
  });
});

describe('validateSignup', () => {
  const validSignup = {
    name: 'Asha',
    username: 'asha_client',
    email: 'asha@example.com',
    mobile: '+91 98765 43210',
    password: 'Password123',
    confirmPassword: 'Password123',
  };

  test('accepts a valid signup', () => {
    const result = validateSignup(validSignup);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual({});
  });

  test('rejects mismatched passwords', () => {
    const result = validateSignup({ ...validSignup, confirmPassword: 'Different123' });
    expect(result.ok).toBe(false);
    expect(result.errors.confirmPassword).toBe('Passwords do not match');
  });

  test('rejects invalid usernames', () => {
    const result = validateSignup({ ...validSignup, username: 'bad-name' });
    expect(result.errors.username).toBe('Use 3-30 lowercase letters, numbers, or underscores');
  });

  test('rejects invalid email', () => {
    const result = validateSignup({ ...validSignup, email: 'not-an-email' });
    expect(result.errors.email).toBe('Enter a valid email address');
  });

  test('rejects mobile numbers with fewer than 10 digits', () => {
    const result = validateSignup({ ...validSignup, mobile: '98765' });
    expect(result.errors.mobile).toBe('Enter a valid mobile number');
  });

  test('rejects short passwords', () => {
    const result = validateSignup({ ...validSignup, password: 'short', confirmPassword: 'short' });
    expect(result.errors.password).toBe('Password must be at least 8 characters');
  });
});

describe('validateLogin', () => {
  test('requires identifier and password', () => {
    const result = validateLogin({});
    expect(result.ok).toBe(false);
    expect(result.errors).toEqual({
      identifier: 'Enter your email, username, or phone',
      password: 'Enter your password',
    });
  });
});
