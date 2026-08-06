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
  shared.conf              http-context settings: rate-limit zones, gzip, real_ip
  vhost-http.conf          DEFAULT — plain HTTP, no certificate needed
  vhost-tls.conf           nginx obtains its own cert via the certbot service
  vhost-host-certs.conf    nginx uses certificates the HOST already manages
  snippets/
    proxy-landing.conf     the proxy_pass block every vhost shares
    security-headers.conf  CSP, frame/sniff/referrer/permissions
    tls-params.conf        protocols, ciphers, session cache, stapling
    acme-challenge.conf    Let's Encrypt HTTP-01 webroot
```

### Cloudflare

`beonedge.in` is served through Cloudflare, so `nginx/shared.conf` enables
`real_ip` from Cloudflare's published ranges with `real_ip_header
CF-Connecting-IP`. Without it every request arrives from a Cloudflare edge
address and **all visitors share one rate-limit bucket**. It is harmless
off-Cloudflare: a direct or localhost connection never matches those ranges.

Cloudflare talks HTTPS to this origin, so the origin needs a working certificate
— HTTP-only is not an option here unless the Cloudflare SSL mode is changed too.

### Rate limits

Keyed on the visitor's address, so these are per-person here — unlike the app
backend, where the caller is one server and the budget is shared.

| Path | Limit | Why |
|---|---|---|
| `/api/newuser`, `/api/newuser/verify-email` | 10r/m, burst 3–5 | Each accepted POST creates an application row and queues an email on the app backend |
| `/_next/static/` | none | A cold page load legitimately fetches dozens of fingerprinted assets |
| everything else | 30r/s, burst 60 | Normal browsing |

If this site sits behind an ALB, CloudFront or Cloudflare, uncomment the matching
`real_ip` block in `nginx/shared.conf`. Without it every visitor shares one
bucket, because `$binary_remote_addr` will be the proxy's address.

### TLS

Plain HTTP is the default on purpose: nginx refuses to start if told to load a
certificate that does not exist, which is always the case on a fresh clone. HTTP
is also the correct shape when an ALB or CloudFront terminates TLS in front.

To terminate TLS here instead:

```bash
docker compose up -d                                  # 1. site up on HTTP

docker compose run --rm certbot certonly \            # 2. get a certificate
  --webroot -w /var/www/certbot \
  -d beonedge.in -d www.beonedge.in \
  --email ops@beonedge.in --agree-tos --no-eff-email

echo 'NGINX_VHOST=./nginx/vhost-tls.conf' >> .env     # 3. switch the vhost
docker compose up -d --force-recreate nginx

docker compose --profile tls up -d certbot            # 4. renewal loop
```

Step 3 is a file swap, not an edit — the HTTP config stays intact. The domain
appears in `vhost-tls.conf` in three places (`server_name` plus the two
certificate paths); if the site moves, change all three, since a mismatch is what
produces a browser trust warning.

Certificates live in a named Docker volume, not a bind mount, so private keys
never sit in the working tree where `git add -A` or a stray `zip -r` could pick
them up.

## Migrating a pm2 + host-nginx box to Docker

If the box currently runs the site under pm2 behind a host nginx, the switch has
three real hazards. None is hard, but skipping any one of them breaks something
that will not be obvious for weeks.

**1. Certificate renewal.** A certbot certificate obtained with `--nginx` has
`authenticator = nginx` in its renewal config, meaning renewal drives the *host*
nginx to answer the challenge. Move nginx into a container and there is nothing
for it to drive: renewal fails silently until the certificate expires. Switch it
to webroot first, pointed at a directory the container serves:

```bash
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot \
  -d beonedge.in -d www.beonedge.in \
  --keep-until-expiring \
  --deploy-hook 'docker compose -f /home/ubuntu/boe_landing/docker-compose.yml exec -T nginx nginx -s reload'
sudo certbot renew --dry-run     # must pass BEFORE you rely on it
```

`--keep-until-expiring` rewrites the renewal parameters without burning a rate
limit on a certificate that is still valid. The deploy hook reloads the container
so a renewed certificate is actually picked up.

**2. Memory.** `next build` is the peak memory moment. On a 2 GB instance with no
swap it can be OOM-killed mid-build, which leaves a half-written `.next` and a
confusing failure. Add swap before building:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**3. Port ownership.** Host nginx holds 80/443; the container cannot bind them
until it is stopped. Stop pm2 too, or two copies of the site compete.

Then the migration itself:

```bash
cd /home/ubuntu/boe_landing
git checkout package-lock.json          # drop local drift so the pull is clean
git pull

cat >> .env <<'EOF'
NGINX_VHOST=./nginx/vhost-host-certs.conf
LETSENCRYPT_SRC=/etc/letsencrypt
ACME_WEBROOT_SRC=/var/www/certbot
EOF
chmod 600 .env                          # it holds NEWUSER_SHARED_SECRET

pm2 delete all && pm2 save              # release :3110
sudo systemctl disable --now nginx      # release :80 and :443

docker compose up -d --build
```

Verify before walking away — a `200` on the homepage does not prove signup works,
because the homepage never touches the app backend:

```bash
curl -sI https://beonedge.in/ | head -1
curl -s -o /dev/null -w '%{http_code}\n' -X POST https://beonedge.in/api/newuser \
  -H 'content-type: application/json' -d '{}'      # expect 400, NOT 502
```

A `502` there means nginx is not routing `/api/` to the app; a `503` means the
app cannot reach `BEO_API_BASE`. Both have been live on this box before, so check
them explicitly.

### Rolling back

pm2 still has the app registered until `pm2 delete`, so the fastest rollback is
the reverse order: `docker compose down`, `sudo systemctl enable --now nginx`,
`pm2 resurrect`.

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
| `NGINX_VHOST` | Optional. Which nginx vhost `docker compose` mounts. Defaults to `./nginx/vhost-http.conf`. |

Both required values are read at **request time**, not build time — so the Docker
image carries neither, and they must be supplied to the running container. `.env`
is gitignored; only `.env.example` is committed.

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
