// Signup field rules, shared by the browser form and the server route handler.
//
// Deliberately mirrors the app backend's `newUserBodySchema` + `normalizePhone`
// so a visitor gets a friendly inline message instead of a generic 400. The
// server re-runs these rules because client-side validation is a convenience,
// never a guarantee — a request can reach /api/newuser without the form.
//
// Pure and dependency-free: no mutation, always returns fresh objects.

/** Matches the backend: E.164, leading +, 8-15 digits total, no leading zero. */
const E164_PATTERN = /^\+[1-9][0-9]{7,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTROL_CHARS = /[\u0000-\u001f\u007f-\u009f]/;

/** Default country code applied to a bare national number. */
const DEFAULT_DIAL_CODE = '+91';

export type SignupInput = {
  fullName?: string;
  email?: string;
  phone?: string;
  acceptedConsents?: boolean;
};

export type NormalizedSignup = {
  fullName: string;
  email: string;
  phone: string;
  acceptedConsents: boolean;
};

export type SignupErrors = Partial<Record<keyof NormalizedSignup, string>>;

function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Turn what a person actually types into E.164.
 *
 * Visitors type `98765 43210`, `098765-43210`, `+91 98765 43210` and
 * `0091 9876543210`. The backend accepts only `+919876543210`, so without this
 * every one of those becomes a 400 the visitor cannot act on. Anything already
 * carrying an explicit country code is respected; a bare Indian national number
 * (optionally with a trunk `0`) gets the default dial code.
 */
export function normalizePhone(raw: string): string {
  const trimmed = toText(raw).trim();
  if (!trimmed) return '';

  // Strip formatting the backend also ignores, and normalise 00 → +.
  let candidate = trimmed.replace(/[\s()\-.]/g, '');
  if (candidate.startsWith('00')) candidate = `+${candidate.slice(2)}`;

  if (candidate.startsWith('+')) return candidate;

  const digits = candidate.replace(/[^0-9]/g, '');
  // A single trunk prefix is a typing habit, not part of the number.
  const national = digits.length === 11 && digits.startsWith('0') ? digits.slice(1) : digits;
  return national ? `${DEFAULT_DIAL_CODE}${national}` : '';
}

/** Trim, lowercase the email, and canonicalise the phone. Pure. */
export function normalizeSignup(input: SignupInput = {}): NormalizedSignup {
  return {
    fullName: toText(input.fullName).trim().replace(/\s+/g, ' '),
    email: toText(input.email).trim().toLowerCase(),
    phone: normalizePhone(toText(input.phone)),
    acceptedConsents: input.acceptedConsents === true,
  };
}

export function validateSignup(input: SignupInput = {}): {
  ok: boolean;
  values: NormalizedSignup;
  errors: SignupErrors;
} {
  const values = normalizeSignup(input);

  // Count code points, not UTF-16 units, so an emoji or a composed Indic
  // grapheme is not charged double against the 120 limit — same as the backend.
  const nameLength = [...values.fullName].length;
  const fullNameError =
    nameLength < 2 || nameLength > 120
      ? 'Enter your full name (2 to 120 characters)'
      : CONTROL_CHARS.test(values.fullName)
        ? 'Your name contains characters we cannot accept'
        : undefined;

  const emailError =
    EMAIL_PATTERN.test(values.email) && values.email.length <= 254
      ? undefined
      : 'Enter a valid email address';

  const phoneError = E164_PATTERN.test(values.phone)
    ? undefined
    : 'Enter a valid mobile number with country code, e.g. +91 98765 43210';

  const consentError = values.acceptedConsents
    ? undefined
    : 'Please accept the Terms and Privacy Policy to continue';

  const errors: SignupErrors = {
    ...(fullNameError ? { fullName: fullNameError } : {}),
    ...(emailError ? { email: emailError } : {}),
    ...(phoneError ? { phone: phoneError } : {}),
    ...(consentError ? { acceptedConsents: consentError } : {}),
  };

  return { ok: Object.keys(errors).length === 0, values, errors };
}
