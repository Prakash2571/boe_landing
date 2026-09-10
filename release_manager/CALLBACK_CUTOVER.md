# PhonePe callback cutover

The PhonePe dashboard URL remains
`https://www.beonedge.in/api/v1/provider-events/phonepe/payment`.
The relay classifies authenticated events and forwards the original JSON and
Authorization header to the owning app's payment, subscription, or refund route.
The dashboard must subscribe to the payment, refund, and enabled AutoPay events;
setting a URL in an app `.env` does not register it with PhonePe.

## Configuration contract

In the landing stack `.env`, replace `eventsUrl` in every `PAYMENT_CALLERS` entry
with `callbackBaseUrl`. The two callers are:

| service | callbackBaseUrl | returnUrl |
| --- | --- | --- |
| boe-dev | https://dev-app.beonedge.in/api/v1/provider-events/phonepe | https://dev-app.beonedge.in/pay/return |
| boe-prod | https://app.beonedge.in/api/v1/provider-events/phonepe | https://app.beonedge.in/pay/return |

Keep each caller's existing secret and PhonePe environment. Each app's
`PAYMENTS_SERVICE_NAME` and `PAYMENTS_SERVICE_SECRET` must match its own caller.
Use `http://boe-payment-service:47430` for `PAYMENTS_SERVICE_URL`. The relay,
both API containers, and payment/collection workers share the private
`boe_payments` network. Both Compose projects treat it as an externally provisioned internal
network. Web frontends, databases, and email workers do not join it.

The relay and both app backends must use the same `PHONEPE_CALLBACK_USERNAME`
and `PHONEPE_CALLBACK_PASSWORD` registered for the shared PhonePe SHA webhook.
These are distinct from the per-caller service secrets. Never print secrets in
verification output. Keep VPS `.env` files owner-readable only (`600`).

`PAYMENT_PUBLIC_ORIGIN=https://www.beonedge.in` stays on landing. Public app/API
and APK download origins remain environment-specific. Change landing's
`BEO_API_BASE` to production only when the production API is ready; recreating
the landing container activates that setting.

## Reference ownership

New merchant references include the authenticated service, reference kind, and
UUID: `boe-dev_order_<32 hex>`, `boe-prod_subscription_<32 hex>`, and
`boe-prod_refund_<32 hex>`. Callback routing must resolve all supplied merchant
references to the same configured caller. Unknown, unqualified, and conflicting
references are rejected; the relay never selects the first caller as a fallback.

Existing database references are not rewritten. Before switching nginx, finish
or reconcile outstanding old-reference payments/refunds and resolve existing
old-reference mandates explicitly. An active mandate can generate callbacks
long after setup, so merely waiting for checkout sessions to expire is not
sufficient. If old mandates must remain active, a separately reviewed persistent
ownership mapping is required before cutover. Do not enable the new relay with
an implicit development fallback.

## Deployment order

1. Review and commit both repositories. Build and test backend and relay changes.
2. Pause new payment checkouts, mandate setups, and scheduled collections in all
   active environments. While the old relay is still running, finish or reconcile
   outstanding old-reference payments/refunds and resolve old-reference mandates.
   The new relay rejects old references on internal status and cancellation calls
   as well as callbacks, so this inventory must be resolved before replacing it.
3. Update landing caller configuration and align callback credentials. Create the
   private network before deploying app containers:
   `docker network inspect boe_payments` or, if absent,
   `docker network create --internal boe_payments`. Verify its `Internal` property
   is true and inspect membership if the network already exists.
4. Deploy the updated app backend and workers for each active environment, keeping
   payment creation and collection commands paused. Build and recreate the payment
   service explicitly: `docker compose --profile payments up -d --build payments`.
   A normal landing-only deploy does not update this service.
5. Verify all caller identities, callback destinations, credentials, private
   network connectivity, and completion of the old-reference cutover.
6. Copy `nginx/boe-landing.conf` to the VPS staging directory. Back up the active
   `/etc/nginx/sites-available/boe-landing`, install the reviewed configuration,
   run `sudo nginx -t`, then `sudo systemctl reload nginx`. These steps require
   interactive sudo on the current VPS. Do not restart cloudflared.
7. Verify unsigned callbacks return 401 on payment/subscription/refund paths and
   unrelated `/api/` paths remain inaccessible. Resume payment commands only after
   routing is in place, then verify approved controlled payment flows reach the
   correct environment. Do not inject fabricated successful callbacks for real
   orders. Inspect dashboard delivery status and backend reconciliation before
   declaring the cutover complete.

## VPS audit at implementation completion

The active host nginx still sends callbacks directly to the development backend
on port 47423. The relay configuration is saved as an inactive candidate; it has
not been installed in `/etc/nginx/sites-available/boe-landing`.

All three `.env` files have mode `600`. App service identities and service secrets
match the landing caller entries. The remaining configuration changes are:

- Replace both landing `eventsUrl` entries with the `callbackBaseUrl` values above.
- Align production callback credentials with the shared dashboard credentials
  already used by landing and development.
- Recreate landing against its production `BEO_API_BASE` only after that API is
  ready. Editing the `.env` alone does not update a running container.

Both callers currently use PhonePe's production environment, including `boe-dev`.
Development payment attempts therefore use the real provider environment.
Production auth/encryption key isolation also needs review before first release;
shared development keys must not be rotated in place over existing encrypted data.

Verification: backend typecheck, lint, build and 901 unit tests passed; relay
typecheck, build and 126 tests passed. The payment settlement integration suite
passed all 25 tests. Three email-verification integration failures were reproduced
on unchanged HEAD and remain unrelated to this patch. Six local HTTP checks used
real backend-generated references through relay delivery and the backend SHA
verifier, covering both environments and all three callback families. Compose
validation and runtime/environment deployment contract checks passed. Live
provider payment completion has not been tested as part of this change.

## Nginx files

`nginx/boe-landing.conf` is the VPS host candidate, covering both apex and www.
It depends on the host's `boe_general`/`boe_signup` limit zones and
`/etc/nginx/snippets/boe-landing-headers.conf` already installed on the VPS.
The provider prefix goes to port 47430 with `/api/` retained. It does not expose
the relay's internal payment API. `nginx/vhost.conf` remains the separate bundled
container configuration.

Saving this file does not deploy or activate it. The old direct-to-development
nginx route must not be replaced until the callback prerequisites above pass.
