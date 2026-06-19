import { NextResponse } from 'next/server';
import { serverEnv } from '@/lib/env';

export async function GET() {
  const upstream = await fetch(`${serverEnv.backendBase()}/v1/public/plans`, {
    method: 'GET',
    headers: { 'content-type': 'application/json' },
    cache: 'no-store',
  });

  const payload = await upstream.json().catch(() => ({ ok: false, error: 'Upstream response was not JSON.' }));
  return NextResponse.json(payload, { status: upstream.status });
}
