// SERVER-ONLY. The single place this site talks to the BeOnEdge app backend.
//
// One call on the unversioned external prefix the app stack keeps stable for us
// (`/v1` is its internal contract and evolves without warning):
//
//   POST /newuser  create a signup (needs x-signup-key)
//
// Why the secret never leaves the server: it is the app backend's only proof
// that a signup came from this site. Importing this module from a client
// component would inline it into the browser bundle, so everything here runs in
// a route handler and the browser only ever sees our own same-origin /api/*.

import { serverEnv } from './env';

/**
 * How long any call to the app backend may take before we give up and answer
 * the browser ourselves. 20s sits deliberately under nginx's 30s
 * proxy_read_timeout in front of this route: if we let the fetch hang, nginx is
 * the one that answers first — with a bare HTML 504 the form cannot parse —
 * while a self-imposed abort lets the route handler return its own JSON with a
 * message the visitor can act on. It also bounds how long an overloaded backend
 * (the parallel-signups pile-up) can hold a worker.
 */
export const UPSTREAM_TIMEOUT_MS = 20_000;

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

export type NewUserOutcome = 'created' | 'duplicate_pending' | 'duplicate_account';

export type NewUserResponse = {
  accepted: boolean;
  outcome: NewUserOutcome;
  verificationEmailQueued: false;
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

/**
 * A timeout is also not a rejection, but it is not "unreachable" either: the
 * app may still be processing the signup when we stop listening. It maps to
 * 504 so the route handler can word it as "taking too long, try again" instead
 * of the connection-failure message.
 */
function timedOut<T>(): BackendResult<T> {
  return {
    ok: false,
    status: 504,
    data: null,
    code: 'BACKEND_TIMEOUT',
    fields: null,
    replay: false,
  };
}

/**
 * AbortSignal.timeout rejects the fetch with an error whose `name` is
 * 'TimeoutError' (a DOMException on Node 18.17+). Anything else in the catch
 * is a genuine network failure — DNS, refused connection, reset — which maps
 * to BACKEND_UNREACHABLE. The name check is the portable way to tell the two
 * apart; the message text varies between Node versions.
 */
function isTimeout(error: unknown): boolean {
  return error instanceof Error && error.name === 'TimeoutError';
}

export async function createNewUser(
  request: NewUserRequest,
): Promise<BackendResult<NewUserResponse>> {
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
      redirect: 'error',
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
  } catch (error) {
    return isTimeout(error) ? timedOut() : unreachable();
  }

  return toResult(response.status, await readEnvelope(response));
}
