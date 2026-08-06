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

function optional(name: string, fallback: string): string {
  const value = process.env[name];
  return value && value.trim() ? value.trim() : fallback;
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
    return required('BEO_API_BASE').replace(/\/$/, '');
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
