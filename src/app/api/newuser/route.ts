// POST /api/newuser — same-origin door for the signup form.
//
// The browser never talks to the app backend directly. It posts here, and this
// handler forwards to POST {BEO_API_BASE}/newuser with the x-signup-key secret.
// Two reasons that indirection is not ceremony:
//   1. The secret stays server-side. A browser call would have to carry it.
//   2. No CORS. The app backend deliberately does not allow this origin, since
//      it never needs to serve a browser on beonedge.in.
//
// Responses are reshaped into a small, stable contract for the form so the UI
// does not depend on the app's internal error envelope.

import { NextRequest, NextResponse } from 'next/server';

import { createNewUser } from '@/lib/newuser';
import { validateSignup } from '@/lib/signup';

export const runtime = 'nodejs';

type ApiResponse = {
  ok: boolean;
  message: string;
  fields?: Record<string, string>;
};

const GENERIC_RETRY = 'We could not complete your signup. Please try again in a moment.';

function json(body: ApiResponse, status: number): NextResponse {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, message: 'Send a JSON body.' }, 400);
  }

  // Re-validate server-side: the form is a convenience, not a gate.
  const { ok, values, errors } = validateSignup(payload as Record<string, unknown>);
  if (!ok) {
    return json(
      {
        ok: false,
        message: 'Please check the highlighted fields.',
        fields: errors as Record<string, string>,
      },
      400,
    );
  }

  const result = await createNewUser({
    fullName: values.fullName,
    email: values.email,
    phone: values.phone,
    password: values.password,
    acceptedConsents: true,
  });

  if (result.ok) {
    return json(
      {
        ok: true,
        message: 'Check your email — we have sent you a link to confirm your address.',
      },
      202,
    );
  }

  // A rejected signup must never look successful, but it also must not leak the
  // app's internals. Each case below is one a visitor or an operator can act on.
  switch (result.code) {
    case 'VALIDATION_FAILED':
      return json(
        {
          ok: false,
          message: 'Please check the highlighted fields.',
          // Flatten the app's per-field arrays to the first message each.
          ...(result.fields
            ? {
                fields: Object.fromEntries(
                  Object.entries(result.fields).map(([field, messages]) => [field, messages[0]]),
                ),
              }
            : {}),
        },
        400,
      );

    case 'RATE_LIMITED':
      return json(
        { ok: false, message: 'Too many signups just now. Please try again in a minute.' },
        429,
      );

    case 'AUTHENTICATION_REQUIRED':
      // Our own key is wrong or missing — a deployment fault, not the visitor's.
      // Say nothing specific publicly; the server log carries the detail.
      console.error(
        '[newuser] the app backend rejected our x-signup-key — check NEWUSER_SHARED_SECRET matches the app stack',
      );
      return json({ ok: false, message: GENERIC_RETRY }, 502);

    case 'BACKEND_UNREACHABLE':
      console.error('[newuser] could not reach the app backend at BEO_API_BASE');
      return json({ ok: false, message: GENERIC_RETRY }, 503);

    case 'DEPENDENCY_UNAVAILABLE':
      /*
       * Something the app needs to accept a signup is down — most often the
       * breached-password check, which fails closed rather than admitting a
       * password it could not screen, and occasionally a missing published
       * consent document. Both are transient from the visitor's side and neither
       * is a fault in what they typed, so the message says to retry rather than
       * sending them back to the form to change something.
       */
      console.error('[newuser] the app backend reported a dependency outage while accepting a signup');
      return json(
        {
          ok: false,
          message: 'We could not complete your signup just now. Please try again in a few minutes.',
        },
        503,
      );

    default:
      console.error(`[newuser] unexpected app response: ${result.status} ${result.code ?? ''}`);
      return json({ ok: false, message: GENERIC_RETRY }, 502);
  }
}
