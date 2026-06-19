// Server-side-only environment configuration for the landing app.
//
// These values are read on the server (route handlers / next.config) and are
// NEVER shipped to the browser. Required values throw a clear error when they
// are missing so the landing fails fast instead of silently mis-proxying to the
// backend. Set them in `.env.local` (see `.env.example`).

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
  /** Base URL of the private backend API (e.g. http://127.0.0.1:47502). Required. */
  backendBase(): string {
    return required('BEO_API_BASE').replace(/\/$/, '');
  },

  /** Shared secret injected as the x-signup-key header on signup. Required. */
  signupProxySecret(): string {
    return required('SIGNUP_PROXY_SECRET');
  },

  /** Origin used for the backend signup fallback gate. Optional (dev default). */
  signupAllowedOrigin(): string {
    return optional('SIGNUP_ALLOWED_ORIGIN', 'http://127.0.0.1:3110');
  },
};
