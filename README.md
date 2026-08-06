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

## The one integration with the app stack

This site owns no accounts, no sessions and no database. It has exactly **one**
job against the BeOnEdge app backend (the `boe_app` repo): hand it a new signup,
and host the page its confirmation email links to.

| Action | From → To | Mechanism |
|---|---|---|
| **Sign up** | `/signup` → `/api/newuser` → `{BEO_API_BASE}/newuser` | Route handler attaches `x-signup-key` server-side |
| **Confirm email** | emailed link → `/verify-email?token=…` → `/api/newuser/verify-email` → `{BEO_API_BASE}/newuser/verify-email` | Route handler redeems the token server-side |
| Client app **Sign up** button | client APK → `https://beonedge.in/signup` | `VITE_BEO_ONBOARDING_URL` in the app repo |

Everything after that belongs to the app stack: it verifies the email, an admin
approves the application in the admin panel, and the person receives their access
details for the client APK. Approval, login and credentials are **not** this
site's concern.

### Sign up

```
POST /api/newuser                                    (same-origin, from the form)
  → POST {BEO_API_BASE}/newuser
headers: x-signup-key: {NEWUSER_SHARED_SECRET}
body:    { fullName, email, phone, acceptedConsents: true }
```

`phone` must be E.164 (`+919876543210`). `src/lib/signup.ts` converts what people
actually type — `98765 43210`, `098765-43210`, `0091…` — into that form, and
mirrors the backend's own rules so a visitor gets an inline message instead of a
bare 400. The backend resolves the current Terms/Privacy versions itself, which
is why the form sends a single `acceptedConsents` boolean and no version strings.

A success is `202 Accepted`, not "logged in": no session, cookie or password is
involved anywhere in this flow.

### Confirm email

The app backend composes the link as `${PUBLIC_LANDING_ORIGIN}/verify-email?token=…`,
so **the `/verify-email` path and its `token` query parameter are a contract** —
changing either breaks every link already sitting in an inbox.

```
POST /api/newuser/verify-email
  → POST {BEO_API_BASE}/newuser/verify-email
body: { token }
```

Redeemed server-side so the single-use token never reaches the app API from a
browser (no `Referer` leak), and so the app backend does not have to allow this
origin through CORS.

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
and rate limits. The two route handlers above forward one path each, and nothing
else is reachable.

## Environment

Two values, both server-side only, neither prefixed `NEXT_PUBLIC_`. See
`.env.example`.

| Var | Meaning |
|---|---|
| `BEO_API_BASE` | App API base **including** `/api`, e.g. `https://dev-app.beonedge.in/api`. The app host's nginx strips `/api` before proxying. |
| `NEWUSER_SHARED_SECRET` | Must be byte-identical to `NEWUSER_SHARED_SECRET` in the app stack's `.env`, or every signup is refused with 401. `openssl rand -hex 32`. |

Both are read at **request time**, not build time — so the Docker image carries
neither, and they must be supplied to the running container.

## Structure

```
src/
  app/        layout.tsx · page.tsx · signup · verify-email · api/newuser/* · globals.css
  components/ Nav, Hero, CourseCatalog, PremiumBenefits, LearningMethod,
              FinancialNews, SocialProof, Plans, EnquiryForm, LeadForm,
              SignupForm, VerifyEmail, Footer, Reveal
  content/    config-driven copy (courses, plans, benefits, news, legal, …)
  lib/        signup.ts · newuser.ts · env.ts · validation.ts · courses.ts · plans.ts
```

The course and plan catalogues are **static content** in `src/content/`. They are
not fetched from the app backend, which is why that backend no longer carries
`courses` or `membership_plans` tables.
