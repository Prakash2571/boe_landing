// POST /api/newuser/verify-email — redeems the token from the signup email.
//
// The email links to https://beonedge.in/verify-email?token=… (the app backend
// builds that URL from its PUBLIC_LANDING_ORIGIN), so this site owns the page
// and this handler completes the round trip to the app backend.
//
// Redeemed server-side on purpose: the token then never appears in a browser
// network log or a Referer header on its way to the app API, and the app backend
// does not need to allow this origin through CORS.

import { NextRequest, NextResponse } from 'next/server';

import { verifyNewUserEmail } from '@/lib/newuser';

export const runtime = 'nodejs';

/** The app issues a 43-character URL-safe token. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;

type ApiResponse = { ok: boolean; message: string; state?: 'used' | 'expired' | 'invalid' };

function json(body: ApiResponse, status: number): NextResponse {
  return NextResponse.json(body, { status });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return json({ ok: false, message: 'Send a JSON body.', state: 'invalid' }, 400);
  }

  const token = (payload as { token?: unknown })?.token;
  if (typeof token !== 'string' || !TOKEN_PATTERN.test(token)) {
    // Shape-check first so an obviously malformed link costs no upstream call.
    return json(
      { ok: false, message: 'This confirmation link is not valid.', state: 'invalid' },
      400,
    );
  }

  const result = await verifyNewUserEmail(token);

  if (result.ok) {
    return json({
      ok: true,
      message: 'Your email is confirmed. Our team will review your application shortly.',
    }, 200);
  }

  switch (result.code) {
    case 'TOKEN_ALREADY_USED':
      // Not an error worth alarming anyone about: the common cause is opening
      // the same link twice, and the address is already confirmed either way.
      return json(
        { ok: false, message: 'This link was already used — your email is confirmed.', state: 'used' },
        200,
      );

    case 'TOKEN_EXPIRED':
      return json(
        {
          ok: false,
          message: 'This confirmation link has expired. Please sign up again to get a new one.',
          state: 'expired',
        },
        410,
      );

    case 'TOKEN_INVALID':
      return json(
        { ok: false, message: 'This confirmation link is not valid.', state: 'invalid' },
        400,
      );

    case 'BACKEND_UNREACHABLE':
      console.error('[verify-email] could not reach the app backend at BEO_API_BASE');
      return json(
        { ok: false, message: 'We could not confirm your email right now. Please try again shortly.' },
        503,
      );

    default:
      console.error(`[verify-email] unexpected app response: ${result.status} ${result.code ?? ''}`);
      return json(
        { ok: false, message: 'We could not confirm your email right now. Please try again shortly.' },
        502,
      );
  }
}
