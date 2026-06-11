import { NextRequest } from 'next/server';
import { proxyAuthPost } from '../proxy';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  return proxyAuthPost(req, 'logout', { forwardCookies: true });
}
