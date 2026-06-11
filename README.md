# landing_page — public finance-education site (Next.js)

The public, **education-only** marketing surface for BeOnEdge. It sells finance
**courses** and premium money insights (curated news, explainers, templates,
live sessions). It is deliberately separate from the APK-only investing client app.

> **Education-only by company policy.** This surface must never carry investing,
> SIP, portfolio, fund, or account-opening language. Sign in / Sign up create a
> **learner account** (the gateway account) — never an investment/brokerage
> account, and the internal eligibility/email flow is never described here.

## Stack

- Next.js 14 (App Router) · React 18 · TypeScript
- Vanilla CSS design tokens (no Tailwind/Radix) — see `src/app/globals.css`
- Vitest for unit tests

Standalone build: this package is **excluded from the npm workspace** so its
Next.js dependency tree stays self-contained.

## Commands

```bash
cd frontend_stack/packages/landing_page
npm install        # first time
npm run dev        # http://localhost:3100
npm run build      # production build
npm run start      # serve the production build
npm test           # vitest unit tests (lead validation)
```

## Structure

```
src/
  app/        layout.tsx · page.tsx · login · signup · api/auth · globals.css
  components/ Nav, Hero, CourseCatalog, PremiumBenefits, LearningMethod,
              FinancialNews, SocialProof, Plans, LeadForm, LoginForm,
              SignupForm, AuthProvider, Footer, Reveal
  content/    config-driven copy (courses, benefits, news, plans, …)
  lib/        validation.ts · onboarding.ts · auth.ts
```

## How it connects (whole-site flow)

This page is the **public entry point**; the user app and admin app are APK
surfaces. The Vite web admin remains local-dev-only.

| Action | From → To | Mechanism | Env var |
|---|---|---|---|
| Lead / learner-account form | landing `/api/onboarding/applications` → backend `/v1/onboarding/applications` | Next.js **rewrite** (server-side proxy — no CORS, backend host stays private) | `BEO_API_BASE` |
| **Sign in** | landing `/login` → backend `/v1/auth/login` | Next.js route handler relays httpOnly cookies | `BEO_API_BASE` |
| **Sign up** | landing `/signup` → backend `/v1/auth/signup` | Next.js route handler injects `x-signup-key` server-side | `BEO_API_BASE`, `SIGNUP_PROXY_SECRET` |
| Client app **Sign up** | client `openOnboarding()` → landing `/signup` | `VITE_BEO_ONBOARDING_URL` (client app) |

Signup creates the real credentialed client account. The browser never sees
`SIGNUP_PROXY_SECRET`; it is read only by the landing server.

### Lead form → backend

```
POST /api/onboarding/applications          (same-origin)
  → rewritten to {BEO_API_BASE}/v1/onboarding/applications
body: { name, email, phone, interest?, message? }
```

`validation.ts` mirrors `backend_controller/src/website/services/onboardingService.js`
so the form fails fast before submit. `BEO_API_BASE` is **server-side only**
(never shipped to the browser); see `.env.example`.

### Auth proxy → backend

```
POST /api/auth/signup
  → {BEO_API_BASE}/v1/auth/signup
headers: x-signup-key: {SIGNUP_PROXY_SECRET}
body: { name, username, email, phone, password }

POST /api/auth/login
  → {BEO_API_BASE}/v1/auth/login
body: { identifier, password }
```

The backend response sets httpOnly `access_token` and `refresh_token` cookies.
The landing stores only the returned `user` object in `localStorage` to drive
the nav state.

### Production topology

Put a reverse proxy in front so `/` serves this Next.js app and `/v1` reaches
the backend bound to `127.0.0.1`. In dev, run the landing page (`:3100` by
default), the Vite local admin (`:5173`), and the backend (`:47502`) side by side.
