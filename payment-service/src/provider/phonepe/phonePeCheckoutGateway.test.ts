import { describe, expect, it, vi } from "vitest"

import { createPhonePeGateway } from "./phonePeCheckoutGateway.js"
import type { PhonePeCheckoutClient, PhonePeGatewayConfig } from "./phonePeCheckoutGateway.js"

const RETURN_URL = "https://www.beonedge.in/payment-return?s=boe-dev"
const MESSAGE = "BeOnEdge investment"

const config: PhonePeGatewayConfig = Object.freeze({
  clientId: "id",
  clientSecret: "secret",
  clientVersion: "1",
  env: "production" as const,
  callbackUsername: "u",
  callbackPassword: "p",
  callbackUrl: "https://www.beonedge.in/api/v1/provider-events/phonepe/payment",
  checkoutRedirectUrl: RETURN_URL,
  checkoutMessage: MESSAGE,
  checkoutAllowedOrigins: Object.freeze(["https://mercury-t2.phonepe.com"]),
})

const harness = () => {
  const sent: Record<string, unknown>[] = []
  const client: PhonePeCheckoutClient = Object.freeze({
    pay: vi.fn(async (request: unknown) => {
      sent.push(request as Record<string, unknown>)
      return {
        orderId: "OMO1",
        state: "PENDING",
        expireAt: 1_800_000_000_000,
        redirectUrl: "https://mercury-t2.phonepe.com/transact/pgv3?token=abc",
      }
    }),
    getOrderStatus: vi.fn(async () => ({ state: "PENDING" })),
    refund: vi.fn(async () => ({ state: "PENDING" })),
    getRefundStatus: vi.fn(async () => ({ state: "PENDING" })),
  })
  return { gateway: createPhonePeGateway({ config, client }), sent }
}

const order = Object.freeze({
  merchantOrderId: "boe_b02d2cb1372a449c92c9a0863f0dc08f",
  amountPaise: "100",
  redirectUrl: null,
  expireAfterSeconds: 900,
})

const flowOf = (body: Record<string, unknown>): Record<string, unknown> =>
  body.paymentFlow as Record<string, unknown>

describe("phonePe checkout payload", () => {
  it("sends a payer-facing message", async () => {
    const { gateway, sent } = harness()
    await gateway.createCheckout(order)

    expect(sent).toHaveLength(1)
    expect(flowOf(sent[0]!).message).toBe(MESSAGE)
  })

  it("keeps the merchant order id out of what the payer reads", async () => {
    const { gateway, sent } = harness()
    await gateway.createCheckout(order)

    const message = flowOf(sent[0]!).message
    expect(typeof message).toBe("string")
    expect(message).not.toContain(order.merchantOrderId)
    expect(message).not.toContain("boe_")
    expect(message).not.toContain("Payment for")
  })

  it("still sends the merchant order id where the provider needs it", async () => {
    const { gateway, sent } = harness()
    await gateway.createCheckout(order)

    expect(sent[0]!.merchantOrderId).toBe(order.merchantOrderId)
    expect(sent[0]!.amount).toBe(100)
  })

  it("returns the browser to the caller-tagged return url", async () => {
    const { gateway, sent } = harness()
    await gateway.createCheckout(order)

    const urls = flowOf(sent[0]!).merchantUrls as Record<string, unknown>
    expect(urls.redirectUrl).toBe(RETURN_URL)
    expect(new URL(String(urls.redirectUrl)).searchParams.get("s")).toBe("boe-dev")
  })

  it("prefers a per-call return url when one is given", async () => {
    const { gateway, sent } = harness()
    await gateway.createCheckout({
      ...order,
      redirectUrl: "https://www.beonedge.in/payment-return?s=boe-prod",
    })

    const urls = flowOf(sent[0]!).merchantUrls as Record<string, unknown>
    expect(urls.redirectUrl).toBe("https://www.beonedge.in/payment-return?s=boe-prod")
  })
})
