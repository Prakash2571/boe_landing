# BeOnEdge landing page — Next.js standalone production image.
# Built as a self-contained package (next.config sets outputFileTracingRoot to
# this dir + output: 'standalone'), so workspace hoisting is not required.

FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# No build args for the backend contract on purpose.
#
# BEO_API_BASE and NEWUSER_SHARED_SECRET are read at REQUEST time by the route
# handlers in src/app/api/newuser/*, not baked into the bundle. Passing them here
# would be misleading (a build stage ENV does not reach the runtime stage below)
# and passing a secret as a build arg would persist it in the image history.
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3100
ENV HOSTNAME=0.0.0.0

# Required at RUNTIME — supply both when starting the container:
#   -e BEO_API_BASE=https://dev-app.beonedge.in/api
#   -e NEWUSER_SHARED_SECRET=<same value as the app stack's .env>
# Signup throws a clear "Missing required environment variable" if either is
# absent, rather than silently posting nowhere.

# Standalone output bundles only the traced node_modules + server.js.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static

USER node
EXPOSE 3100

HEALTHCHECK --interval=15s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 3100) + '/').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server.js"]
