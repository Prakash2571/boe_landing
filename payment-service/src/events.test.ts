import { describe, expect, it } from "vitest"

import { normalizeCallback } from "./events.js"
import type { VerifiedCallback } from "./provider/phonepe/paymentGateway.js"

const NOW = new Date("2026-09-01T10:00:00.000Z")

const callback = (overrides: Partial<VerifiedCallback> = {}): VerifiedCallback => ({
  event: "checkout.order.completed",
  outcome: "succeeded",
  providerState: "COMPLETED",
  merchantOrderId: "BOE-ORDER-1",
  merchantRefundId: null,
  originalMerchantOrderId: null,
  providerOrderId: "OMO123",
  providerRefundId: null,
  amountPaise: "100",
  details: [],
  ...overrides,
})

describe("provider event normalization", () => {
  it("maps a completed checkout to PAYMENT_COMPLETED", () => {
    const event = normalizeCallback(callback(), NOW, "evt-1")

    expect(event.type).toBe("PAYMENT_COMPLETED")
    expect(event.status).toBe("SUCCESS")
    expect(event.merchantOrderId).toBe("BOE-ORDER-1")
    expect(event.providerReference).toBe("OMO123")
    expect(event.occurredAt).toBe("2026-09-01T10:00:00.000Z")
  })

  it("keeps the provider's own vocabulary as evidence without leaking it as the type", () => {
    const event = normalizeCallback(callback(), NOW, "evt-2")

    expect(event.providerEvent).toBe("checkout.order.completed")
    expect(event.providerState).toBe("COMPLETED")
  })

  it("never promotes an unrecognised outcome to success", () => {
    expect(normalizeCallback(callback({ outcome: "pending", providerState: "WEIRD" }), NOW).status)
      .toBe("PENDING")
    expect(normalizeCallback(callback({ outcome: "failed" }), NOW).type).toBe("PAYMENT_FAILED")
  })

  it("classifies refunds by the refund id even when the event name is generic", () => {
    const event = normalizeCallback(
      callback({ event: "order.completed", merchantRefundId: "BOE-REFUND-1", providerRefundId: "PR9" }),
      NOW,
    )

    expect(event.type).toBe("REFUND_COMPLETED")
    expect(event.merchantRefundId).toBe("BOE-REFUND-1")
    expect(event.providerReference).toBe("OMO123")
  })

  it("classifies mandate setup separately from collections", () => {
    expect(normalizeCallback(callback({ event: "checkout.setup.order.completed" }), NOW).type)
      .toBe("MANDATE_ACTIVATED")
    expect(normalizeCallback(callback({ event: "subscription.notification.completed" }), NOW).type)
      .toBe("AUTOPAY_COLLECTION_COMPLETED")
    expect(normalizeCallback(callback({ event: "subscription.redemption.order.failed", outcome: "failed" }), NOW).type)
      .toBe("AUTOPAY_COLLECTION_FAILED")
  })

  it("carries payment details through for evidence", () => {
    const event = normalizeCallback(
      callback({
        details: [{
          transactionId: "T1",
          reference: "R1",
          instrumentType: "UPI",
          state: "COMPLETED",
          amountPaise: "100",
        }],
      }),
      NOW,
    )

    expect(event.details).toHaveLength(1)
    expect(event.details[0]?.transactionId).toBe("T1")
  })

  it("gives every event a stable id supplied by the caller", () => {
    expect(normalizeCallback(callback(), NOW, "evt-fixed").eventId).toBe("evt-fixed")
  })
})
