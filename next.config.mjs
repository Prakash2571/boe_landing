/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Produce a self-contained server bundle (.next/standalone/server.js) for the
  // production Docker image. Pairs with outputFileTracingRoot below so workspace
  // hoisting does not break the trace.
  output: 'standalone',
  // Keep file tracing rooted at this package so hoisting cannot confuse the
  // build. (Top-level in Next 15+; under experimental in Next 14.)
  experimental: {
    outputFileTracingRoot: import.meta.dirname,
  },

  // No rewrites to the app backend, deliberately.
  //
  // There used to be two. `/api/onboarding/:path*` pointed at a backend route
  // that no longer exists. `/v1/:path*` was worse: it republished the app's
  // ENTIRE internal API — including `/v1/admin/*` — under this public marketing
  // origin, bypassing the app host's own nginx rules and rate limits.
  //
  // Everything this site needs from the app is now two explicit route handlers,
  // `src/app/api/newuser/*`, which forward exactly one path each and attach the
  // signup secret server-side. A blanket proxy cannot do that safely.
};

export default nextConfig;
