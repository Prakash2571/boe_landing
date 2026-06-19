import { NextRequest, NextResponse } from 'next/server';
import { serverEnv } from '@/lib/env';

export const runtime = 'nodejs';

// Rejects a pending learner account. Forwards the admin's httpOnly cookie.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const upstream = await fetch(
    `${serverEnv.backendBase()}/v1/admin/users/${encodeURIComponent(params.id)}/reject`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        cookie: req.headers.get('cookie') || '',
      },
      cache: 'no-store',
    },
  );

  const payload = await upstream
    .json()
    .catch(() => ({ ok: false, error: 'Upstream response was not JSON.' }));
  return NextResponse.json(payload, { status: upstream.status });
}
