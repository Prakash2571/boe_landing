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

/**
 * Fields the form actually renders. Upstream detail is keyed by its own schema,
 * which also emits keys that are not inputs at all — `_root` for a whole-body
 * problem such as an unrecognised key. Passing those through as field errors
 * would highlight nothing, which is the dead end this mapping exists to avoid.
 */
const FORM_FIELDS = ['fullName', 'email', 'phone', 'password', 'acceptedConsents'] as const;

function splitUpstreamFields(fields: Record<string, string[]> | null): {
  onFields: Record<string, string>;
  offFields: string[];
} {
  const onFields: Record<string, string> = {};
  const offFields: string[] = [];

  for (const [key, messages] of Object.entries(fields ?? {})) {
    const first = messages?.[0];
    if (!first) continue;
    if ((FORM_FIELDS as readonly string[]).includes(key)) onFields[key] = first;
    else offFields.push(`${key}: ${first}`);
  }

  return { onFields, offFields };
}

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
    /*
     * A replay means the app recognised this exact identity from a recent
     * submission and returned its stored answer without doing anything: no
     * application was created or refreshed, and no email was sent. Saying "we
     * have sent you a link" here is how someone ends up waiting for a mail that
     * does not exist and never appears in the review queue. The key is derived
     * from name + email + phone and lives for 24 hours, so the way forward is
     * either the earlier email or a change to one of those details.
     */
    if (result.replay) {
      return json(
        {
          ok: true,
          message:
            'We already have an application with these details from the last 24 hours. ' +
            'Please use the confirmation link in the email we sent you then. If you did not ' +
            'get it, contact support rather than submitting again.',
        },
        202,
      );
    }

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
    case 'VALIDATION_FAILED': {
      /*
       * Only say "check the highlighted fields" when something is actually
       * highlighted. Upstream detail that maps to no input — or no detail at all,
       * which is what a dropped envelope path used to produce — has to be stated
       * in the message instead, or the visitor is told to fix something with
       * nothing marked and no way to know what.
       */
      const { onFields, offFields } = splitUpstreamFields(result.fields);
      const highlighted = Object.keys(onFields).length > 0;

      if (!highlighted) {
        console.error(
          `[newuser] the app rejected a signup with no usable field detail: ${
            offFields.join('; ') || '(none supplied)'
          }`,
        );
      }

      return json(
        {
          ok: false,
          message: highlighted
            ? 'Please check the highlighted fields.'
            : 'We could not accept these details. Please check your entries and try again, or contact support if this keeps happening.',
          ...(highlighted ? { fields: onFields } : {}),
        },
        400,
      );
    }

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
