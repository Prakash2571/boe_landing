// Server-side-only environment configuration for the landing app.
//
// These values are read on the server (route handlers) and are NEVER shipped to
// the browser. Required values throw a clear error when they are missing so the
// landing fails fast instead of silently mis-posting signups. Set them in
// `.env.local` (see `.env.example`).

function required(name: string): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable "${name}". Add it to .env.local (see .env.example).`,
    );
  }
  return value.trim();
}

const PRODUCTION_API_HOSTS = new Set(['dev-app.beonedge.in', 'app.beonedge.in']);

function appApiBase(): string {
  const raw = required('BEO_API_BASE');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('BEO_API_BASE must be a valid absolute URL.');
  }
  const path = url.pathname.replace(/\/$/u, '');
  if (process.env.NODE_ENV === 'production'
    && (url.protocol !== 'https:'
      || !PRODUCTION_API_HOSTS.has(url.hostname)
      || url.port
      || url.username
      || url.password
      || path !== '/api'
      || url.search
      || url.hash)) {
    throw new Error('BEO_API_BASE must be a canonical BeOnEdge HTTPS /api origin in production.');
  }
  return `${url.origin}${path}`;
}

export const serverEnv = {
  /**
   * Public base URL of the BeOnEdge app API, INCLUDING the `/api` prefix —
   * e.g. `https://dev-app.beonedge.in/api`.
   *
   * That prefix matters: nginx on the app host strips `/api` before proxying, so
   * the backend's own route is `/newuser` while the public URL is
   * `/api/newuser`. This site is on separate infrastructure (AWS) and reaches
   * the app stack over the public internet, so there is no private host or
   * docker network to fall back to.
   */
  appApiBase(): string {
    return appApiBase();
  },

  /**
   * The shared secret this site presents as `x-signup-key` on POST /newuser.
   * It is the ONLY thing that identifies this site to the app backend: the call
   * is server-to-server, so there is no browser Origin the backend could trust.
   * Required — without it every signup is refused with 401.
   */
  newuserSharedSecret(): string {
    return required('NEWUSER_SHARED_SECRET');
  },
};
