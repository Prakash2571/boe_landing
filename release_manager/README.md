# boe_landing release manager

The deploy flow that was previously done by hand, as one script.

```
release_manager/deploy.sh            interactive menu
release_manager/deploy.sh status     local, VPS and container state
release_manager/deploy.sh deploy     gates, push, pull, build, restart, verify
release_manager/deploy.sh verify     probe the deployed site over the network
release_manager/deploy.sh --help     everything else
```

## What a full deploy does

1. **Gates, locally** — `tsc --noEmit`, `next lint`, `vitest run`, `next build`. Also runs the
   payment service's own typecheck and tests if that directory exists, as a warning rather than a
   failure, because it is not deployed by default.
2. **Push** — shows the unpushed commits and asks before pushing.
3. **Pull on the VPS** — `git pull --ff-only`, so a diverged checkout stops rather than merges.
   Untracked files on the VPS, including `docker-compose.override.yml`, are left alone.
4. **Build** — `docker compose build` for one service. The site keeps serving during this.
5. **Recreate** — `docker compose up -d` for that service, then polls until the container reports
   healthy. This is the only step with downtime, and it asks first.
6. **Verify** — 22 checks over the public network. See below.

## What verify checks

- Marketing site answers, `www` redirects to the apex, and the redirect preserves the path.
- `/api/newuser` rejects an empty body, and no other `/api/` path is exposed.
- The PhonePe callback paths reach the backend on both hostnames and reject an unsigned callback
  with `401`. A `404`, `301` or `302` here is a failure: it means the proxy to the backend is gone.
- `/api/v1/client/orders` and the client auth route are **not** reachable on the approved domain.
- `/pay/return/{dev,app}` redirect into the right app, an unknown target `404`s, and a query
  parameter cannot move the destination host.
- `/pay/go` accepts a correctly signed provider link with its query string intact, and refuses a
  swapped target, a correctly signed non-provider host, an unsigned link and an expired link. The
  third of those is the open-redirect check and matters most.
- The container is healthy, the VPS checkout matches local `HEAD`, and `PAY_REDIRECT_SECRET`
  actually reaches the process — not merely that it is present in `.env`. A value sitting in `.env`
  that compose never passes through has already caused one silent failure on this project.

Verify is read-only and safe to run at any time.

## Things it deliberately does not do

- **It does not touch nginx.** That needs root, and `install-privileged.sh` also restarts
  cloudflared, which drops the tunnel. Do nginx by hand when it changes.
- **It does not start the payment service.** That service sits behind a compose `payments` profile,
  so a normal `up` only touches `landing`. Pass `--service payments` to act on it deliberately.
- **It does not manage the shared signing secret.** `deploy.sh secret` generates one and prints
  where each half goes, but writing it is manual: it has to match `PAYMENT_START_SECRET` on the app
  stack, and getting that wrong makes every payment link fail closed.

## Environment

| variable | default |
| --- | --- |
| `BOE_SSH_ALIAS` | `beonedge` |
| `BOE_REMOTE_DIR` | `/srv/dev_stack/BOE_LANDING/repo` |
| `BOE_BRANCH` | `dev/tamagami-hi` |
| `BOE_SERVICE` | `landing` |
| `BOE_CONTAINER` | `boe-landing` |

`--yes` skips every prompt, for a scripted run. Without a terminal and without `--yes` the script
refuses rather than assuming.
