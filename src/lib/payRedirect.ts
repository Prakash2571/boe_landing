import { createHmac, timingSafeEqual } from 'node:crypto';

export const PROVIDER_HOST_ALLOWLIST: readonly string[] = [
  'mercury.phonepe.com',
  'mercury-t2.phonepe.com',
  'mercury-uat.phonepe.com',
];

export type PayRedirectDecision =
  | { readonly ok: true; readonly target: string }
  | { readonly ok: false; readonly reason: PayRedirectFailure };

export type PayRedirectFailure =
  | 'missing-parameters'
  | 'bad-signature'
  | 'expired'
  | 'malformed-target'
  | 'host-not-allowed';

export const signPayRedirect = (secret: string, encodedTarget: string, expiry: string): string =>
  createHmac('sha256', secret).update(`${encodedTarget}\n${expiry}`, 'utf8').digest('hex');

const constantTimeEqual = (a: string, b: string): boolean => {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
};

export const decidePayRedirect = (
  input: Readonly<{
    secret: string;
    encodedTarget: string | null;
    expiry: string | null;
    signature: string | null;
    now: number;
  }>,
): PayRedirectDecision => {
  const { secret, encodedTarget, expiry, signature, now } = input;
  if (
    encodedTarget === null || encodedTarget === '' ||
    expiry === null || expiry === '' ||
    signature === null || signature === ''
  ) {
    return { ok: false, reason: 'missing-parameters' };
  }

  const expected = signPayRedirect(secret, encodedTarget, expiry);
  if (!constantTimeEqual(expected, signature)) return { ok: false, reason: 'bad-signature' };

  const expiresAt = Number(expiry);
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return { ok: false, reason: 'expired' };

  let decoded: string;
  try {
    decoded = Buffer.from(encodedTarget, 'base64url').toString('utf8');
  } catch {
    return { ok: false, reason: 'malformed-target' };
  }

  let url: URL;
  try {
    url = new URL(decoded);
  } catch {
    return { ok: false, reason: 'malformed-target' };
  }
  if (url.protocol !== 'https:') return { ok: false, reason: 'malformed-target' };
  if (url.username !== '' || url.password !== '') return { ok: false, reason: 'malformed-target' };
  if (!PROVIDER_HOST_ALLOWLIST.includes(url.hostname)) return { ok: false, reason: 'host-not-allowed' };

  return { ok: true, target: url.toString() };
};
