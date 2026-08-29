import { NextResponse } from 'next/server';

import { decidePayRedirect } from '@/lib/payRedirect';

export const dynamic = 'force-dynamic';

const NO_STORE = { 'Cache-Control': 'no-store' } as const;

const refuse = (status: number): NextResponse =>
  new NextResponse(
    [
      '<!doctype html><html lang="en"><head><meta charset="utf-8">',
      '<title>Payment link not valid</title>',
      '<meta name="viewport" content="width=device-width,initial-scale=1"></head>',
      '<body><h1>This payment link is not valid</h1>',
      '<p>Please return to the app and start the payment again.</p></body></html>',
    ].join(''),
    { status, headers: { ...NO_STORE, 'Content-Type': 'text/html; charset=utf-8' } },
  );

export const GET = (request: Request): NextResponse => {
  const secret = process.env.PAY_REDIRECT_SECRET ?? '';
  if (secret.length < 32) return refuse(500);

  const params = new URL(request.url).searchParams;
  const decision = decidePayRedirect({
    secret,
    encodedTarget: params.get('u'),
    expiry: params.get('e'),
    signature: params.get('s'),
    now: Date.now(),
  });

  if (!decision.ok) return refuse(decision.reason === 'expired' ? 410 : 400);

  return NextResponse.redirect(decision.target, { status: 302, headers: NO_STORE });
};
