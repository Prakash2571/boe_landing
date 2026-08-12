# boe_landing — public finance-education site (Next.js)

The public, **education-only** marketing surface for BeOnEdge. It sells finance
**courses** and premium money insights (curated news, explainers, templates,
live sessions). It is deliberately separate from the APK-only investing client
app, and it lives in its own repository on its own infrastructure (AWS,
`beonedge.in`).

> **Education-only by company policy.** This surface must never carry investing,
> SIP, portfolio, fund, or account-opening language. Signing up creates a
> **learner account application** — never an investment/brokerage account — and
> the internal eligibility/email flow is never described here.

## Stack

- Next.js 14 (App Router) · React 18 · TypeScript
- Vanilla CSS design tokens (no Tailwind/Radix) — see `src/app/globals.css`
- Vitest for unit tests

## Commands

```bash
npm install        # first time
npm run dev        # http://localhost:3110
npm run build      # production build
npm run start      # serve the production build
npm test           # vitest unit tests
```

## Running the whole thing with Docker

The repo is self-contained: clone it, fill two values, and one command brings up
the site behind nginx.

```bash
cp .env.example .env       # set BEO_API_BASE and NEWUSER_SHARED_SECRET
docker compose up -d --build
# → http://localhost
```

Two containers. `landing` is the Next.js standalone server on port 3110, and it is
**not** published on the host — nginx is the only way in, so the rate limits and
security headers below cannot be bypassed by hitting Next.js directly. `nginx`
publishes 80 and 443.

Compose refuses to start if either required value is missing, rather than passing
an empty string and looking healthy until the first signup fails.

```
nginx/
  vhost.conf               the one server block: signup limit, assets, proxy
  shared.conf              http-context settings: rate-limit zones, gzip, real_ip
  snippets/
    proxy-landing.conf     the proxy_pass block every location shares
    security-headers.conf  CSP, frame/sniff/referrer/permissions
```

There is one vhost and no TLS configuration. TLS always terminates in front of
this origin, so the origin holds no certificate and there is nothing for certbot
to obtain or renew here. See **TLS** below.

### Cloudflare

`beonedge.in` is served through Cloudflare, so `nginx/shared.conf` enables
`real_ip` from Cloudflare's published ranges with `real_ip_header
CF-Connecting-IP`. Without it every request arrives from a Cloudflare edge
address and **all visitors share one rate-limit bucket**. It is harmless
off-Cloudflare: a direct or localhost connection never matches those ranges.

Cloudflare reaches this origin over a **Tunnel**: `cloudflared` runs on the box
and opens an outbound connection to Cloudflare, so nothing of this site listens on
the public internet and the origin needs no certificate of its own. Plain HTTP
between the tunnel and nginx is correct, not a compromise.

### Rate limits

Keyed on the visitor's address, so these are per-person here — unlike the app
backend, where the caller is one server and the budget is shared.

| Path | Limit | Why |
|---|---|---|
| `/api/newuser` | 30r/m, burst 10 | Each accepted POST creates an application row on the app backend. Burst 10 so several people behind one NAT can sign up at once |
| `/_next/static/` | none | A cold page load legitimately fetches dozens of fingerprinted assets |
| everything else | 30r/s, burst 60 | Normal browsing |

If this site sits behind an ALB, CloudFront or Cloudflare, uncomment the matching
`real_ip` block in `nginx/shared.conf`. Without it every visitor shares one
bucket, because `$binary_remote_addr` will be the proxy's address.

### TLS

There is none here, and that is deliberate.

TLS terminates at the Cloudflare edge. Traffic reaches the box through an
outbound tunnel, so there is no public listener to present a certificate on, and
an ACME HTTP-01 challenge has no address to answer at. The repo therefore ships
one plain-HTTP vhost and no certbot: configuration for a certificate that cannot
exist reads as an option, and someone eventually tries to take it.

If this site is ever moved to an origin that is directly addressable — an EC2 box
behind an ALB, say — TLS belongs on the load balancer, and this vhost is already
the right shape for that.

## How it is actually deployed

Worth knowing before changing anything in `nginx/`, because in production **this
repo's nginx does not run**.

On the VPS the site runs as one container publishing `127.0.0.1:47410`, and the
**host** nginx serves it. A `docker-compose.override.yml` on that box (untracked,
VPS-only) puts the bundled `nginx` service behind an unused profile, because the
host nginx already owns :80 and a second one cannot bind it — a tunnelled origin
does name-based routing for every hostname on the box in one place.

That means the config actually serving `beonedge.in` lives on the VPS, at
`/srv/dev_stack/BOE_LANDING/nginx/boe-landing.conf` (installed to
`/etc/nginx/sites-available/boe-landing`, with its headers snippet in
`/etc/nginx/snippets/`), and **not in this repository**. It reproduces what
`nginx/` does here — CF-Connecting-IP real_ip, the signup limit with the JSON 429,
security headers — against the host's shared zones.

So `nginx/` in this repo is for local work and for any future directly-addressed
deployment. Editing it does not change production; editing the host vhost does.

## The one integration with the app stack

This site owns no accounts, no sessions and no database. It has exactly **one**
job against the BeOnEdge app backend (the `boe_app` repo): hand it a new signup.

| Action | From → To | Mechanism |
|---|---|---|
| **Sign up** | `/signup` → `/api/newuser` → `{BEO_API_BASE}/newuser` | Route handler attaches `x-signup-key` server-side |
| Client app **Sign up** button | client APK → `https://beonedge.in/signup` | `VITE_BEO_ONBOARDING_URL` in the app repo |

Everything after that belongs to the app stack: an admin approves or rejects the
application, approval email carries the official client APK link, and in-app KYC
verifies the mailbox using an OTP. Approval, login and credentials are **not**
this site's concern.

### Sign up

```
POST /api/newuser                                    (same-origin, from the form)
  → POST {BEO_API_BASE}/newuser
headers: x-signup-key: {NEWUSER_SHARED_SECRET}
body:    { fullName, email, phone, password, acceptedConsents: true }
```

`phone` must be E.164 (`+919876543210`). `src/lib/signup.ts` converts what people
actually type — `98765 43210`, `098765-43210`, `0091…` — into that form, and
mirrors the backend's own rules so a visitor gets an inline message instead of a
bare 400. The backend resolves the current Terms/Privacy versions itself, which
is why the form sends a single `acceptedConsents` boolean and no version strings.

A success is `202 Accepted`, not "logged in": no session or cookie is created.
The password is forwarded over TLS once and becomes the app credential only if
an admin approves the application.

### Why a server-side hop at all

Two reasons, both structural rather than stylistic:

1. **The secret stays on the server.** `NEWUSER_SHARED_SECRET` is the app
   backend's only proof that a signup came from this site. A browser call would
   have to carry it, which would publish it.
2. **No CORS.** The app backend deliberately does not list `beonedge.in` as an
   allowed browser origin, because it never needs to serve a page here. A
   server-to-server call has no Origin to allow.

There is deliberately **no blanket proxy** to the app API. An earlier
`/v1/:path*` rewrite republished the app's entire internal surface — including
`/v1/admin/*` — under this public origin, bypassing the app host's nginx rules
and rate limits. The single route handler above forwards only signup, and
nothing else is reachable.

## Environment

Two values, both server-side only, neither prefixed `NEXT_PUBLIC_`. See
`.env.example`.

| Var | Meaning |
|---|---|
| `BEO_API_BASE` | App API base **including** `/api`, e.g. `https://dev-app.beonedge.in/api`. The app host's nginx strips `/api` before proxying. |
| `NEWUSER_SHARED_SECRET` | Must be byte-identical to `NEWUSER_SHARED_SECRET` in the app stack's `.env`, or every signup is refused with 401. `openssl rand -hex 32`. |

Both required values are read at **request time**, not build time — so the Docker
image carries neither, and they must be supplied to the running container. `.env`
is gitignored; only `.env.example` is committed.

## Structure

```
src/
  app/        layout.tsx · page.tsx · signup · api/newuser · globals.css
  components/ Nav, Hero, CourseCatalog, PremiumBenefits, LearningMethod,
              FinancialNews, SocialProof, Plans, EnquiryForm, LeadForm,
              SignupForm, Footer, Reveal
  content/    config-driven copy (courses, plans, benefits, news, legal, …)
  lib/        signup.ts · newuser.ts · env.ts · validation.ts · courses.ts · plans.ts
```

The course and plan catalogues are **static content** in `src/content/`. They are
not fetched from the app backend, which is why that backend no longer carries
`courses` or `membership_plans` tables.
