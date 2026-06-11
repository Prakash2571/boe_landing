// Pure lead-form validation. Mirrors the backend rules in
// backend_controller/src/website/services/onboardingService.js so the public
// site fails fast with friendly messages before submitting. Dependency-free
// and side-effect-free; always returns fresh objects (no mutation).

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PHONE_DIGITS = 10;

export type LeadInput = {
  name?: string;
  email?: string;
  phone?: string;
  interest?: string;
  message?: string;
};

export type NormalizedLead = {
  name: string;
  email: string;
  phone: string;
  interest: string;
  message: string;
};

export type LeadErrors = Partial<Record<'name' | 'email' | 'phone', string>>;

function toText(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function digitsOnly(value: unknown): string {
  return toText(value).replace(/[^0-9]/g, '');
}

/** Trim inputs and lowercase the email. Pure - returns a fresh object. */
export function normalizeLead(input: LeadInput = {}): NormalizedLead {
  return {
    name: toText(input.name).trim(),
    email: toText(input.email).trim().toLowerCase(),
    phone: toText(input.phone).trim(),
    interest: toText(input.interest).trim(),
    message: toText(input.message).trim(),
  };
}

/** Validate the lead fields. Builds a fresh errors object; never mutates. */
export function validateLead(input: LeadInput = {}): {
  ok: boolean;
  errors: LeadErrors;
} {
  const normalized = normalizeLead(input);

  const nameError = normalized.name ? undefined : 'Enter your name';
  const emailError = EMAIL_PATTERN.test(normalized.email)
    ? undefined
    : 'Enter a valid email address';
  const phoneError =
    normalized.phone && digitsOnly(input.phone).length >= MIN_PHONE_DIGITS
      ? undefined
      : 'Enter a valid phone number';

  const errors: LeadErrors = {
    ...(nameError ? { name: nameError } : {}),
    ...(emailError ? { email: emailError } : {}),
    ...(phoneError ? { phone: phoneError } : {}),
  };

  return { ok: Object.keys(errors).length === 0, errors };
}
