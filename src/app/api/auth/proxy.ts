import { NextRequest, NextResponse } from 'next/server';

const BACKEND = (process.env.BEO_API_BASE || 'http://127.0.0.1:47502').replace(/\/$/, '');

type ProxyOptions = {
  isSignup?: boolean;
  forwardCookies?: boolean;
};

function getUpstreamCookies(headers: Headers): string[] {
  const extendedHeaders = headers as Headers & { getSetCookie?: () => string[] };
  const cookies = extendedHeaders.getSetCookie?.();
  if (cookies && cookies.length > 0) return cookies;

  const fallback = headers.get('set-cookie');
  return fallback ? [fallback] : [];
}

function appendUpstreamCookies(response: NextResponse, upstream: Response) {
  for (const cookie of getUpstreamCookies(upstream.headers)) {
    response.headers.append('set-cookie', cookie);
  }
}

async function readJsonBody(req: NextRequest): Promise<string> {
  const body = await req.text();
  return body.trim() ? body : '{}';
}

async function readUpstreamPayload(upstream: Response): Promise<unknown> {
  try {
    return await upstream.json();
  } catch {
    return { ok: false, error: 'Upstream response was not JSON.' };
  }
}

export async function proxyAuthPost(
  req: NextRequest,
  authPath: 'signup' | 'login' | 'logout',
  options: ProxyOptions = {},
) {
  const body = await readJsonBody(req);
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };

  const deviceId = req.headers.get('x-device-id');
  if (deviceId) headers['x-device-id'] = deviceId;

  const authorization = req.headers.get('authorization');
  if (authorization) headers.authorization = authorization;

  if (options.forwardCookies) {
    const cookie = req.headers.get('cookie');
    if (cookie) headers.cookie = cookie;
  }

  if (options.isSignup) {
    headers['x-signup-key'] = process.env.SIGNUP_PROXY_SECRET || '';
    headers.origin = process.env.SIGNUP_ALLOWED_ORIGIN || req.headers.get('origin') || '';
  }

  const upstream = await fetch(`${BACKEND}/v1/auth/${authPath}`, {
    method: 'POST',
    headers,
    body,
    cache: 'no-store',
  });

  const payload = await readUpstreamPayload(upstream);
  const response = NextResponse.json(payload, { status: upstream.status });
  appendUpstreamCookies(response, upstream);
  return response;
}
