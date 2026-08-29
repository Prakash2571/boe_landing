import { beforeEach, describe, expect, it, vi } from "vitest"

import type { CallerConfig, ServiceConfig } from "./config/env.js"
import type { NormalizedEvent } from "./events.js"
import type { CallerRuntime } from "./gateways.js"
import { createNonceStore, sign } from "./http/serviceAuth.js"
import { createSessionStore } from "./sessions.js"
import {
  GatewayAuthenticationError,
  GatewayUnavailableError,
} from "./provider/phonepe/paymentGateway.js"
import type { PaymentGateway, VerifiedCallback } from "./provider/phonepe/paymentGateway.js"
import type { RecurringPaymentGateway } from "./provider/phonepe/recurringPaymentGateway.js"
import { buildServer } from "./server.js"

const SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef"
const NOW = new Date("2026-09-01T10:00:00.000Z")

const caller: CallerConfig = Object.freeze({
  service: "boe-dev",
  secret: SECRET,
  eventsUrl: "https://dev-app.beonedge.in/api/v1/internal/payment-events",
  returnUrl: "https://dev-app.beonedge.in/dashboard",
  phonepeEnv: "production",
})

const config = (overrides: Partial<ServiceConfig> = {}): ServiceConfig => Object.freeze({
  host: "127.0.0.1",
  port: 0,
  logLevel: "fatal" as const,
  phonepe: Object.freeze({
    clientId: "id",
    clientSecret: "secret",
    clientVersion: "1",
    merchantId: "M1",
    callbackUsername: "u",
    callbackPassword: "p",
    requestTimeoutMs: 10_000,
  }),
  publicOrigin: "https://www.beonedge.in",
  returnPath: "/payment-return",
  callbackPaths: Object.freeze({
    payment: "/api/v1/provider-events/phonepe/payment",
    subscription: "/api/v1/provider-events/phonepe/subscription",
  }),
  callers: new Map([[caller.service, caller]]),
  eventDeliveryTimeoutMs: 10_000,
  replayWindowSeconds: 300,
  maintenanceState: "NORMAL" as const,
  ...overrides,
})

const recurring = (overrides: Partial<RecurringPaymentGateway> = {}): RecurringPaymentGateway => ({
  createMandateCheckout: vi.fn(async () => ({
    providerOrderId: "OMO-M1",
    providerState: "PENDING" as const,
    redirectUrl: "https://mercury-t2.phonepe.com/transact/pgv3?token=mandate",
    expiresAt: new Date("2026-09-01T10:15:00.000Z"),
  })),
  getSetupOrderStatus: vi.fn(async () => ({
    state: "COMPLETED" as const,
    providerOrderId: "OMO-M1",
    merchantSubscriptionId: "boe-dev_SUB-1",
    providerSubscriptionId: "PSUB1",
    paymentDetails: [],
  })),
  getMandateStatus: vi.fn(async () => ({
    state: "ACTIVE" as const,
    merchantSubscriptionId: "boe-dev_SUB-1",
    providerSubscriptionId: "PSUB1",
  })),
  notifyCollection: vi.fn(async () => ({
    providerOrderId: "OMO-C1",
    providerState: "NOTIFICATION_IN_PROGRESS" as const,
    expiresAt: new Date("2026-09-02T10:00:00.000Z"),
  })),
  getCollectionStatus: vi.fn(async () => ({
    state: "NOTIFIED" as const,
    merchantOrderId: "boe-dev_COL-1",
    providerOrderId: "OMO-C1",
    merchantSubscriptionId: "boe-dev_SUB-1",
    amountPaise: "100",
    expiresAt: new Date("2026-09-02T10:00:00.000Z"),
    paymentDetails: [],
  })),
  cancelMandate: vi.fn(async () => undefined),
  ...overrides,
})

const gateway = (overrides: Partial<PaymentGateway> = {}): PaymentGateway => ({
  createCheckout: vi.fn(async () => ({
    redirectUrl: "https://mercury-t2.phonepe.com/transact/pgv3?token=abc",
    providerOrderId: "OMO1",
    expiresAt: new Date("2026-09-01T10:15:00.000Z"),
  })),
  getOrderStatus: vi.fn(async () => ({
    merchantOrderId: "boe-dev_ORDER-1",
    outcome: "succeeded" as const,
    providerState: "COMPLETED",
    providerOrderId: "OMO1",
    amountPaise: "100",
    currency: "INR",
    details: [],
  })),
  validateShaCallback: vi.fn((): VerifiedCallback => ({
    event: "checkout.order.completed",
    outcome: "succeeded",
    providerState: "COMPLETED",
    merchantOrderId: "boe-dev_ORDER-1",
    merchantRefundId: null,
    originalMerchantOrderId: null,
    providerOrderId: "OMO1",
    providerRefundId: null,
    amountPaise: "100",
    details: [],
  })),
  initiateRefund: vi.fn(async () => ({
    providerRefundId: "PR1",
    outcome: "pending" as const,
    providerState: "PENDING",
  })),
  getRefundStatus: vi.fn(async () => ({
    merchantRefundId: "BOE-REFUND-1",
    providerRefundId: "PR1",
    originalMerchantOrderId: "boe-dev_ORDER-1",
    amountPaise: "100",
    outcome: "succeeded" as const,
    providerState: "COMPLETED",
  })),
  ...overrides,
})

const build = (
  overrides: Partial<{
    config: ServiceConfig
    gateway: PaymentGateway
    recurring: RecurringPaymentGateway
    delivered: boolean
  }> = {},
) => {
  const cfg = overrides.config ?? config()
  const gw = overrides.gateway ?? gateway()
  const rec = overrides.recurring ?? recurring()
  const runtime: CallerRuntime = Object.freeze({ caller, gateway: gw, recurring: rec })
  const events: NormalizedEvent[] = []
  const sessionStore = createSessionStore()
  const app = buildServer({
    config: cfg,
    runtimes: new Map([[caller.service, runtime]]),
    nonces: createNonceStore(cfg.replayWindowSeconds),
    sessions: sessionStore,
    clock: () => NOW,
    deliver: async (_runtime, event) => {
      events.push(event)
      return overrides.delivered ?? true
    },
  })
  return { app, gw, rec, events, sessions: sessionStore }
}

let nonceCounter = 0

const signed = (path: string, payload: unknown, nonce = `n${String(++nonceCounter)}`) => {
  const body = JSON.stringify(payload)
  const timestamp = String(NOW.getTime())
  return {
    method: "POST" as const,
    url: path,
    payload: body,
    headers: {
      "content-type": "application/json",
      "x-boe-service": caller.service,
      "x-boe-timestamp": timestamp,
      "x-boe-nonce": nonce,
      "x-boe-signature": sign(SECRET, "POST", path, timestamp, nonce, body),
    },
  }
}

const CHECKOUT = "/internal/v1/payments/checkout"
const order = { merchantOrderId: "boe-dev_ORDER-1", amountPaise: "100", expireAfterSeconds: 900 }

describe("internal payment API", () => {
  let harness: ReturnType<typeof build>

  beforeEach(() => {
    harness = build()
  })

  it("creates a checkout for a signed caller", async () => {
    const response = await harness.app.inject(signed(CHECKOUT, order))

    expect(response.statusCode).toBe(200)
    const body = response.json()
    expect(body.data.state).toBe("CHECKOUT_CREATED")
    expect(body.data.checkoutUrl).toContain("https://www.beonedge.in/pay/start?t=")
    expect(body.data.merchantOrderId).toBe("boe-dev_ORDER-1")
  })

  it("passes the caller's merchantOrderId through unchanged", async () => {
    await harness.app.inject(signed(CHECKOUT, order))

    expect(harness.gw.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ merchantOrderId: "boe-dev_ORDER-1", amountPaise: "100" }),
    )
  })

  it("never lets the caller choose the redirect URL", async () => {
    await harness.app.inject(signed(CHECKOUT, { ...order, redirectUrl: "https://evil.test" }))

    expect(harness.gw.createCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUrl: null }),
    )
  })

  it("refuses an unsigned request", async () => {
    const response = await harness.app.inject({
      method: "POST",
      url: CHECKOUT,
      payload: JSON.stringify(order),
      headers: { "content-type": "application/json" },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe("SERVICE_UNAUTHENTICATED")
    expect(harness.gw.createCheckout).not.toHaveBeenCalled()
  })

  it("refuses a replayed request", async () => {
    expect((await harness.app.inject(signed(CHECKOUT, order, "same"))).statusCode).toBe(200)
    expect((await harness.app.inject(signed(CHECKOUT, order, "same"))).statusCode).toBe(401)
  })

  it("rejects a non-integer or out-of-range amount", async () => {
    for (const amountPaise of ["1.5", "-1", "", "abc"]) {
      const response = await harness.app.inject(signed(CHECKOUT, { ...order, amountPaise }))
      expect(response.statusCode).toBe(400)
    }
  })

  it("reports a provider outage as retryable", async () => {
    const failing = build({
      gateway: gateway({
        createCheckout: vi.fn(async () => {
          throw new GatewayUnavailableError("down")
        }),
      }),
    })
    const response = await failing.app.inject(signed(CHECKOUT, order))

    expect(response.statusCode).toBe(503)
    expect(response.json().error.code).toBe("PROVIDER_CHECKOUT_FAILED")
  })

  it("blocks new checkouts during maintenance but keeps status readable", async () => {
    const draining = build({ config: config({ maintenanceState: "MAINTENANCE" }) })

    expect((await draining.app.inject(signed(CHECKOUT, order))).statusCode).toBe(503)
    const status = await draining.app.inject(
      signed("/internal/v1/payments/status", { merchantOrderId: "boe-dev_ORDER-1" }),
    )
    expect(status.statusCode).toBe(200)
  })

  it("returns normalized status rather than provider vocabulary", async () => {
    const response = await harness.app.inject(
      signed("/internal/v1/payments/status", { merchantOrderId: "boe-dev_ORDER-1" }),
    )

    expect(response.json().data.status).toBe("SUCCESS")
    expect(response.json().data.providerState).toBe("COMPLETED")
  })
})

describe("provider callbacks", () => {
  const CALLBACK = "/api/v1/provider-events/phonepe/payment"

  it("verifies, normalizes and forwards a callback", async () => {
    const harness = build()
    const response = await harness.app.inject({
      method: "POST",
      url: CALLBACK,
      payload: '{"event":"checkout.order.completed"}',
      headers: { "content-type": "application/json", authorization: "sha256-good" },
    })

    expect(response.statusCode).toBe(200)
    expect(harness.events).toHaveLength(1)
    expect(harness.events[0]?.type).toBe("PAYMENT_COMPLETED")
    expect(harness.events[0]?.merchantOrderId).toBe("boe-dev_ORDER-1")
  })

  it("refuses a callback with no authorization header and forwards nothing", async () => {
    const harness = build()
    const response = await harness.app.inject({
      method: "POST",
      url: CALLBACK,
      payload: "{}",
      headers: { "content-type": "application/json" },
    })

    expect(response.statusCode).toBe(401)
    expect(harness.events).toHaveLength(0)
  })

  it("refuses a callback whose signature does not verify", async () => {
    const harness = build({
      gateway: gateway({
        validateShaCallback: vi.fn(() => {
          throw new GatewayAuthenticationError("nope")
        }),
      }),
    })
    const response = await harness.app.inject({
      method: "POST",
      url: CALLBACK,
      payload: "{}",
      headers: { "content-type": "application/json", authorization: "sha256-bad" },
    })

    expect(response.statusCode).toBe(401)
    expect(response.json().error.code).toBe("PROVIDER_CALLBACK_UNVERIFIED")
    expect(harness.events).toHaveLength(0)
  })

  it("asks the provider to retry when the app could not be reached", async () => {
    const harness = build({ delivered: false })
    const response = await harness.app.inject({
      method: "POST",
      url: CALLBACK,
      payload: "{}",
      headers: { "content-type": "application/json", authorization: "sha256-good" },
    })

    expect(response.statusCode).toBe(503)
    expect(response.json().error.code).toBe("EVENT_NOT_DELIVERED")
  })
})

describe("browser return", () => {
  it("redirects to a configured destination and never to a caller-supplied one", async () => {
    const harness = build()

    const plain = await harness.app.inject({ method: "GET", url: "/payment-return" })
    expect(plain.statusCode).toBe(302)
    expect(plain.headers.location).toBe("https://dev-app.beonedge.in/dashboard")

    const hostile = await harness.app.inject({
      method: "GET",
      url: "/payment-return?s=boe-dev&returnUrl=https%3A%2F%2Fevil.test",
    })
    expect(hostile.headers.location).toBe("https://dev-app.beonedge.in/dashboard")
  })

  it("falls back to the first caller for an unknown service hint", async () => {
    const harness = build()
    const response = await harness.app.inject({ method: "GET", url: "/payment-return?s=stranger" })

    expect(response.headers.location).toBe("https://dev-app.beonedge.in/dashboard")
  })
})


describe("browser-initiated payment start", () => {
  const SESSION = CHECKOUT

  it("issues a start URL on the approved origin", async () => {
    const harness = build()
    const response = await harness.app.inject(signed(SESSION, order))

    expect(response.statusCode).toBe(200)
    const data = response.json().data
    expect(data.state).toBe("CHECKOUT_CREATED")
    const url = new URL(data.checkoutUrl)
    expect(url.origin).toBe("https://www.beonedge.in")
    expect(url.pathname).toBe("/pay/start")
    expect(url.searchParams.get("t")).toBeTruthy()
  })

  it("hands back a start URL rather than the provider URL", async () => {
    const harness = build()
    const response = await harness.app.inject(signed(SESSION, order))

    expect(response.json().data.checkoutUrl).toContain("https://www.beonedge.in/pay/start?t=")
    expect(response.json().data.checkoutUrl).not.toContain("phonepe.com")
    expect(response.json().data.providerReference).toBe("OMO1")
  })

  it("serves a document that launches the provider, rather than redirecting", async () => {
    const harness = build()
    const created = await harness.app.inject(signed(SESSION, order))
    const token = new URL(created.json().data.checkoutUrl).searchParams.get("t") ?? ""

    const response = await harness.app.inject({ method: "GET", url: `/pay/start?t=${token}` })

    expect(response.statusCode).toBe(200)
    expect(response.headers.location).toBeUndefined()
    expect(response.headers["content-type"]).toContain("text/html")
    expect(response.body).toContain("mercury-t2.phonepe.com")
    expect(response.body).toContain("window.location.replace")
  })

  it("declares a referrer policy that sends this origin to the provider", async () => {
    const harness = build()
    const created = await harness.app.inject(signed(SESSION, order))
    const token = new URL(created.json().data.checkoutUrl).searchParams.get("t") ?? ""

    const response = await harness.app.inject({ method: "GET", url: `/pay/start?t=${token}` })

    expect(response.headers["referrer-policy"]).toBe("strict-origin-when-cross-origin")
    expect(response.body).toContain('name="referrer" content="strict-origin-when-cross-origin"')
    expect(response.headers["cache-control"]).toBe("no-store")
  })

  it("offers a no-script fallback so a blocked script does not strand the payer", async () => {
    const harness = build()
    const created = await harness.app.inject(signed(SESSION, order))
    const token = new URL(created.json().data.checkoutUrl).searchParams.get("t") ?? ""

    const response = await harness.app.inject({ method: "GET", url: `/pay/start?t=${token}` })

    expect(response.body).toContain("<noscript>")
    expect(response.body).toMatch(/<a href="https:\/\/mercury-t2\.phonepe\.com/u)
  })

  it("refuses a reused start link", async () => {
    const harness = build()
    const created = await harness.app.inject(signed(SESSION, order))
    const token = new URL(created.json().data.checkoutUrl).searchParams.get("t") ?? ""

    expect((await harness.app.inject({ method: "GET", url: `/pay/start?t=${token}` })).statusCode).toBe(200)
    expect((await harness.app.inject({ method: "GET", url: `/pay/start?t=${token}` })).statusCode).toBe(410)
  })

  it("refuses a missing, empty or invented token", async () => {
    const harness = build()

    for (const url of ["/pay/start", "/pay/start?t=", "/pay/start?t=invented"]) {
      expect((await harness.app.inject({ method: "GET", url })).statusCode).toBe(410)
    }
  })

  it("ignores extra query parameters on the start URL", async () => {
    const harness = build()
    const created = await harness.app.inject(signed(SESSION, order))
    const token = new URL(created.json().data.checkoutUrl).searchParams.get("t") ?? ""

    const response = await harness.app.inject({
      method: "GET",
      url: `/pay/start?t=${token}&amountPaise=5000000&next=https%3A%2F%2Fevil.test`,
    })

    expect(response.body).toContain("mercury-t2.phonepe.com")
    expect(response.body).not.toContain("evil.test")
  })

  it("never issues a start link when the provider refused the checkout", async () => {
    const harness = build({
      gateway: gateway({
        createCheckout: vi.fn(async () => {
          throw new GatewayUnavailableError("down")
        }),
      }),
    })

    expect((await harness.app.inject(signed(SESSION, order))).statusCode).toBe(503)
    expect(harness.sessions.size()).toBe(0)
  })

  it("blocks new sessions during maintenance", async () => {
    const draining = build({ config: config({ maintenanceState: "PAYMENTS_DRAINING" }) })

    expect((await draining.app.inject(signed(SESSION, order))).statusCode).toBe(503)
  })

  it("requires service authentication to mint a start URL", async () => {
    const harness = build()
    const response = await harness.app.inject({
      method: "POST",
      url: SESSION,
      payload: JSON.stringify(order),
      headers: { "content-type": "application/json" },
    })

    expect(response.statusCode).toBe(401)
  })
})

describe("AutoPay", () => {
  const MANDATE = "/internal/v1/autopay/mandates"
  const mandate = {
    merchantOrderId: "boe-dev_SETUP-1",
    merchantSubscriptionId: "boe-dev_SUB-1",
    amountPaise: "100",
    expireAfterSeconds: 900,
    mandateExpiresAt: "2027-09-01T10:00:00.000Z",
  }

  it("creates a mandate checkout and returns a start URL on the approved origin", async () => {
    const harness = build()
    const response = await harness.app.inject(signed(MANDATE, mandate))

    expect(response.statusCode).toBe(200)
    const data = response.json().data
    expect(data.state).toBe("MANDATE_CHECKOUT_CREATED")
    expect(data.checkoutUrl).toContain("https://www.beonedge.in/pay/start?t=")
    expect(data.checkoutUrl).not.toContain("phonepe.com")
    expect(data.providerReference).toBe("OMO-M1")
  })

  it("supplies its own return URL, never one the caller chose", async () => {
    const harness = build()
    await harness.app.inject(signed(MANDATE, { ...mandate, redirectUrl: "https://evil.test" }))

    expect(harness.rec.createMandateCheckout).toHaveBeenCalledWith(
      expect.objectContaining({ redirectUrl: "https://www.beonedge.in/payment-return" }),
    )
  })

  it("launches the mandate page from this origin too", async () => {
    const harness = build()
    const created = await harness.app.inject(signed(MANDATE, mandate))
    const token = new URL(created.json().data.checkoutUrl).searchParams.get("t") ?? ""

    const page = await harness.app.inject({ method: "GET", url: `/pay/start?t=${token}` })
    expect(page.statusCode).toBe(200)
    expect(page.body).toContain("mercury-t2.phonepe.com")
  })

  it("reads mandate setup status, mandate status and cancels", async () => {
    const harness = build()

    const setup = await harness.app.inject(
      signed("/internal/v1/autopay/mandates/setup-status", { merchantOrderId: "boe-dev_SETUP-1" }),
    )
    expect(setup.json().data.state).toBe("COMPLETED")

    const status = await harness.app.inject(
      signed("/internal/v1/autopay/mandates/status", { merchantSubscriptionId: "boe-dev_SUB-1" }),
    )
    expect(status.json().data.state).toBe("ACTIVE")

    const cancelled = await harness.app.inject(
      signed("/internal/v1/autopay/mandates/cancel", { merchantSubscriptionId: "boe-dev_SUB-1" }),
    )
    expect(cancelled.json().data.state).toBe("CANCEL_REQUESTED")
    expect(harness.rec.cancelMandate).toHaveBeenCalledWith("boe-dev_SUB-1")
  })

  it("notifies a collection and reads its status", async () => {
    const harness = build()

    const notified = await harness.app.inject(signed("/internal/v1/autopay/collections", {
      merchantOrderId: "boe-dev_COL-1",
      merchantSubscriptionId: "boe-dev_SUB-1",
      amountPaise: "100",
      expireAt: "2026-09-02T10:00:00.000Z",
    }))
    expect(notified.json().data.state).toBe("COLLECTION_NOTIFIED")
    expect(notified.json().data.providerState).toBe("NOTIFICATION_IN_PROGRESS")

    const status = await harness.app.inject(
      signed("/internal/v1/autopay/collections/status", { merchantOrderId: "boe-dev_COL-1" }),
    )
    expect(status.json().data.state).toBe("NOTIFIED")
    expect(status.json().data.expiresAt).toBe("2026-09-02T10:00:00.000Z")
  })

  it("refuses every AutoPay route without service authentication", async () => {
    const harness = build()
    for (const path of [
      MANDATE,
      "/internal/v1/autopay/mandates/setup-status",
      "/internal/v1/autopay/mandates/status",
      "/internal/v1/autopay/mandates/cancel",
      "/internal/v1/autopay/collections",
      "/internal/v1/autopay/collections/status",
    ]) {
      const response = await harness.app.inject({
        method: "POST",
        url: path,
        payload: "{}",
        headers: { "content-type": "application/json" },
      })
      expect(response.statusCode).toBe(401)
    }
  })

  it("blocks new mandates and collections during maintenance", async () => {
    const draining = build({ config: config({ maintenanceState: "MAINTENANCE" }) })

    expect((await draining.app.inject(signed(MANDATE, mandate))).statusCode).toBe(503)
    expect((await draining.app.inject(signed("/internal/v1/autopay/collections", {
      merchantOrderId: "boe-dev_COL-1",
      merchantSubscriptionId: "boe-dev_SUB-1",
      amountPaise: "100",
      expireAt: "2026-09-02T10:00:00.000Z",
    }))).statusCode).toBe(503)
  })
})
