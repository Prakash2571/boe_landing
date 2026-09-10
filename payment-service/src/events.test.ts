import { afterEach, describe, expect, it, vi } from "vitest"
import { resolveCallbackRoute, deliverCallback } from "./events.js"

const UUID = "b294870c46134c878709de987abb46d7"
const order = (service: string) => `${service}_order_${UUID}`
const subscription = (service: string) => `${service}_subscription_${UUID}`
const refund = (service: string) => `${service}_refund_${UUID}`
const services = ["boe-dev", "boe-prod"]
const callback = (event: string, payload: unknown) => JSON.stringify({ event, payload })

afterEach(() => vi.unstubAllGlobals())

describe("raw PhonePe callback routing", () => {
  it.each(services)("routes a checkout to its originating environment: %s", (service) => {
    expect(resolveCallbackRoute(callback("checkout.order.completed", { merchantOrderId: order(service) }), services))
      .toEqual({ service, kind: "payment" })
  })

  it.each(["SUBSCRIPTION_CHECKOUT_SETUP", "SUBSCRIPTION_CHECKOUT_REDEMPTION", "SUBSCRIPTION_REDEMPTION"])("routes generic checkout events using paymentFlow %s", (type) => {
    expect(resolveCallbackRoute(callback("checkout.order.completed", {
      merchantOrderId: order("boe-prod"),
      paymentFlow: { type, merchantSubscriptionId: subscription("boe-prod") },
    }), services)).toEqual({ service: "boe-prod", kind: "subscription" })
  })

  it.each(["subscription.activated", "subscription.notification.failed", "subscription.redemption.order.completed", "checkout.setup.order.completed"])("routes subscription event %s", (event) => {
    expect(resolveCallbackRoute(callback(event, { merchantSubscriptionId: subscription("boe-prod") }), services))
      .toEqual({ service: "boe-prod", kind: "subscription" })
  })

  it("routes nested subscription references and refuses nested cross-environment references", () => {
    const payload = { merchantOrderId: order("boe-prod"), paymentFlow: {
      type: "SUBSCRIPTION_CHECKOUT_SETUP", subscriptionDetails: { merchantSubscriptionId: subscription("boe-prod") },
    } }
    expect(resolveCallbackRoute(callback("checkout.order.completed", payload), services))
      .toEqual({ service: "boe-prod", kind: "subscription" })
    expect(() => resolveCallbackRoute(callback("checkout.order.completed", {
      ...payload, paymentFlow: { ...payload.paymentFlow, subscriptionDetails: { merchantSubscriptionId: subscription("boe-dev") } },
    }), services)).toThrow()
  })

  it("routes refunds using the refund and original order references", () => {
    expect(resolveCallbackRoute(callback("pg.refund.completed", {
      merchantRefundId: refund("boe-prod"), originalMerchantOrderId: order("boe-prod"),
    }), services)).toEqual({ service: "boe-prod", kind: "refund" })
  })

  it.each([
    {}, { merchantOrderId: "legacy-order" }, { merchantOrderId: order("unknown") },
    { merchantOrderId: order("boe-prod"), merchantSubscriptionId: subscription("boe-dev") },
    { merchantRefundId: refund("boe-dev"), originalMerchantOrderId: order("boe-prod") },
    { merchantOrderId: order("boe-dev"), paymentFlow: { merchantSubscriptionId: subscription("boe-prod") } },
    { merchantOrderId: order("boe-prod"), originalMerchantOrderId: "unknown" },
    { merchantOrderId: 123 }, { merchantOrderId: "" },
  ])("rejects missing, unknown, malformed or mixed-environment references %j", (payload) => {
    expect(() => resolveCallbackRoute(callback("checkout.order.completed", payload), services)).toThrow()
  })

  it.each(["{}", "[]", "null", "{", callback("unrelated.event", { merchantOrderId: order("boe-dev") })])("rejects malformed or unsupported callback %s", (raw) => {
    expect(() => resolveCallbackRoute(raw, services)).toThrow()
  })
})

describe("callback delivery", () => {
  it("preserves raw bytes and provider authorization and refuses redirects", async () => {
    const fetcher = vi.fn(async () => new Response(null, { status: 200 }))
    vi.stubGlobal("fetch", fetcher)
    const rawBody = '{  "event":"checkout.order.completed", "extra":"₹" }\n'
    expect(await deliverCallback("https://app.beonedge.in/api/v1/provider-events/phonepe", {
      kind: "subscription", rawBody, authorization: "original-auth",
    }, 1000)).toBe(true)
    expect(fetcher).toHaveBeenCalledWith("https://app.beonedge.in/api/v1/provider-events/phonepe/subscription", expect.objectContaining({
      method: "POST", redirect: "error", body: rawBody,
      headers: { "Content-Type": "application/json", Authorization: "original-auth" },
    }))
  })

  it.each([401, 404, 429, 500, 503])("does not acknowledge failed backend response %s", async (status) => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(null, { status })))
    expect(await deliverCallback("https://app.beonedge.in/api/v1/provider-events/phonepe", {
      kind: "payment", rawBody: "{}", authorization: "auth",
    }, 1000)).toBe(false)
  })

  it("does not acknowledge network or redirect errors", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => { throw new TypeError("fetch failed") }))
    expect(await deliverCallback("https://app.beonedge.in/api/v1/provider-events/phonepe", {
      kind: "refund", rawBody: "{}", authorization: "auth",
    }, 1000)).toBe(false)
  })
})
