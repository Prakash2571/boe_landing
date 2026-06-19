import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/lib/env';

export const runtime = 'nodejs';

// Lists learner accounts for the admin dashboard. Forwards the httpOnly auth
// cookie so the backend can verify the admin's JWT.
export async function GET(req: NextRequest) {
  const search = req.nextUrl.search || '';
  const upstream = await fetch(`${serverEnv.backendBase()}/v1/admin/users${search}`, {
    method: 'GET',
    headers: {
      'content-type': 'application/json',
      cookie: req.headers.get('cookie') || '',
    },
    cache: 'no-store',
  });

  const payload = await upstream
    .json()
    .catch(() => ({ ok: false, error: 'Upstream response was not JSON.' }));
  return NextResponse.json(payload, { status: upstream.status });
}
