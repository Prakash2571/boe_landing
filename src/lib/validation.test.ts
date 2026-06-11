import { describe, expect, test } from 'vitest';
import { normalizeLead, validateLead } from './validation';

describe('normalizeLead', () => {
  test('trims fields and lowercases the email', () => {
    const result = normalizeLead({
      name: '  Asha  ',
      email: '  ASHA@Example.COM ',
      phone: ' 98765 43210 ',
      interest: ' Premium membership ',
      message: '  hello  ',
    });
    expect(result).toEqual({
      name: 'Asha',
      email: 'asha@example.com',
      phone: '98765 43210',
      interest: 'Premium membership',
      message: 'hello',
    });
  });

  test('returns empty strings for missing input', () => {
    expect(normalizeLead()).toEqual({
      name: '',
      email: '',
      phone: '',
      interest: '',
      message: '',
    });
  });

  test('does not mutate its input', () => {
    const input = { name: ' Bob ' };
    const snapshot = { ...input };
    normalizeLead(input);
    expect(input).toEqual(snapshot);
  });
});

describe('validateLead', () => {
  test('accepts a valid lead', () => {
    const { ok, errors } = validateLead({
      name: 'Asha',
      email: 'asha@example.com',
      phone: '9876543210',
    });
    expect(ok).toBe(true);
    expect(errors).toEqual({});
  });

  test('requires a name', () => {
    const { ok, errors } = validateLead({
      name: '   ',
      email: 'asha@example.com',
      phone: '9876543210',
    });
    expect(ok).toBe(false);
    expect(errors.name).toBe('Enter your name');
  });

  test('rejects an invalid email', () => {
    const { errors } = validateLead({
      name: 'Asha',
      email: 'not-an-email',
      phone: '9876543210',
    });
    expect(errors.email).toBe('Enter a valid email address');
  });

  test('rejects a phone with fewer than 10 digits', () => {
    const { errors } = validateLead({
      name: 'Asha',
      email: 'asha@example.com',
      phone: '98765',
    });
    expect(errors.phone).toBe('Enter a valid phone number');
  });

  test('accepts a formatted phone with 10+ digits', () => {
    const { ok } = validateLead({
      name: 'Asha',
      email: 'asha@example.com',
      phone: '+91 98765-43210',
    });
    expect(ok).toBe(true);
  });

  test('reports all errors at once for empty input', () => {
    const { ok, errors } = validateLead({});
    expect(ok).toBe(false);
    expect(Object.keys(errors).sort()).toEqual(['email', 'name', 'phone']);
  });
});
