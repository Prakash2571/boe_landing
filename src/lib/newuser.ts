// SERVER-ONLY. The single place this site talks to the BeOnEdge app backend.
//
// Two calls, both on the unversioned external prefix the app stack keeps stable
// for us (`/v1` is its internal contract and evolves without warning):
//
//   POST /newuser               create a signup            (needs x-signup-key)
//   POST /newuser/verify-email  redeem an emailed token     (no secret needed)
//
// Why the secret never leaves the server: it is the app backend's only proof
// that a signup came from this site. Importing this module from a client
// component would inline it into the browser bundle, so everything here runs in
// a route handler and the browser only ever sees our own same-origin /api/*.

import { serverEnv } from './env';

/** Shape POST /newuser accepts. It is `.strict()` upstream — no extra fields. */
export type NewUserRequest = {
  fullName: string;
  email: string;
  /** E.164, e.g. +919876543210. */
  phone: string;
  /**
   * The password the applicant will sign in to the app with, in the clear over
   * TLS exactly once. The app backend hashes it with Argon2id on receipt and
   * stores only the hash; nothing on this site persists, logs, or caches it.
   * Note there is no `confirmPassword`: re-entry is checked in the browser and
   * the route handler, and would be rejected here as an unexpected field anyway.
   */
  password: string;
  acceptedConsents: true;
  /**
   * Optional. Supplying one makes a retry safe even if the body differs; when
   * omitted the backend derives a key from the identity, which still collapses
   * a double-submitted form.
   */
  idempotencyKey?: string;
};

export type BackendResult<T> = {
  ok: boolean;
  status: number;
  data: T | null;
  /** Machine-readable code from the app's error catalogue, when present. */
  code: string | null;
  /** Field-level validation detail, when the app supplied it. */
  fields: Record<string, string[]> | null;
  /**
   * True when the app answered from its idempotency store instead of doing the
   * work. The signup was NOT re-created and no new email was sent, so the caller
   * must not tell the visitor to go and check their inbox.
   */
  replay: boolean;
};

type Envelope = {
  ok?: boolean;
  data?: unknown;
  error?: {
    code?: string;
    message?: string;
    /*
     * The app puts per-field detail directly on `error.fields`. It was read from
     * `error.details.fields` here once, which silently matched nothing: every
     * upstream field error was dropped and the form said "check the highlighted
     * fields" with nothing highlighted. `details.fields` is still accepted in
     * case the envelope ever nests it.
     */
    fields?: Record<string, string[]>;
    details?: { fields?: Record<string, string[]> };
  } | null;
  meta?: { idempotencyReplay?: boolean } | null;
};

async function readEnvelope(response: Response): Promise<Envelope> {
  try {
    return (await response.json()) as Envelope;
  } catch {
    return {};
  }
}

function toResult<T>(status: number, envelope: Envelope): BackendResult<T> {
  return {
    ok: status >= 200 && status < 300,
    status,
    data: (envelope.data as T) ?? null,
    code: envelope.error?.code ?? null,
    fields: envelope.error?.fields ?? envelope.error?.details?.fields ?? null,
    replay: envelope.meta?.idempotencyReplay === true,
  };
}

/**
 * A network failure must not look like a rejection: the caller has to be able to
 * tell "the app said no" (a 4xx with a code) from "we never reached the app"
 * (503), because only the second one is worth retrying.
 */
function unreachable<T>(): BackendResult<T> {
  return {
    ok: false,
    status: 503,
    data: null,
    code: 'BACKEND_UNREACHABLE',
    fields: null,
    replay: false,
  };
}

export async function createNewUser(
  request: NewUserRequest,
): Promise<BackendResult<{ accepted: boolean }>> {
  let response: Response;
  try {
    response = await fetch(`${serverEnv.appApiBase()}/newuser`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-signup-key': serverEnv.newuserSharedSecret(),
      },
      body: JSON.stringify(request),
      cache: 'no-store',
    });
  } catch {
    return unreachable();
  }

  return toResult(response.status, await readEnvelope(response));
}

export async function verifyNewUserEmail(
  token: string,
): Promise<BackendResult<{ verified: boolean }>> {
  let response: Response;
  try {
    // No x-signup-key: the token IS the credential here. It is single-use,
    // expiring, and was issued by the app backend to one mailbox.
    response = await fetch(`${serverEnv.appApiBase()}/newuser/verify-email`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
      cache: 'no-store',
    });
  } catch {
    return unreachable();
  }

  return toResult(response.status, await readEnvelope(response));
}
