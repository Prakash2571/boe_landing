import { randomUUID } from "node:crypto"

import type { ProviderOutcome, VerifiedCallback } from "./provider/phonepe/paymentGateway.js"

export type NormalizedEventType =
  | "PAYMENT_COMPLETED"
  | "PAYMENT_FAILED"
  | "PAYMENT_PENDING"
  | "REFUND_COMPLETED"
  | "REFUND_FAILED"
  | "REFUND_PENDING"
  | "MANDATE_ACTIVATED"
  | "MANDATE_FAILED"
  | "MANDATE_PENDING"
  | "AUTOPAY_COLLECTION_COMPLETED"
  | "AUTOPAY_COLLECTION_FAILED"
  | "AUTOPAY_COLLECTION_PENDING"

export type NormalizedStatus = "SUCCESS" | "FAILED" | "PENDING"

export type NormalizedEvent = Readonly<{
  eventId: string
  type: NormalizedEventType
  status: NormalizedStatus
  merchantOrderId: string | null
  merchantRefundId: string | null
  originalMerchantOrderId: string | null
  providerReference: string | null
  amountPaise: string | null
  providerState: string
  providerEvent: string
  occurredAt: string
  details: readonly Readonly<{
    transactionId: string
    reference: string | null
    instrumentType: string | null
    state: string | null
    amountPaise: string | null
  }>[]
}>

const STATUS_OF: Readonly<Record<ProviderOutcome, NormalizedStatus>> = Object.freeze({
  succeeded: "SUCCESS",
  failed: "FAILED",
  pending: "PENDING",
})

type Family = "payment" | "refund" | "mandate" | "collection"

const familyOf = (providerEvent: string, callback: VerifiedCallback): Family => {
  const event = providerEvent.toLowerCase()
  if (event.includes("refund")) return "refund"
  if (callback.merchantRefundId !== null) return "refund"
  if (event.includes("subscription.notification") || event.includes("redemption")) return "collection"
  if (event.includes("subscription") || event.includes("setup")) return "mandate"
  return "payment"
}

const TYPE_OF: Readonly<Record<Family, Readonly<Record<NormalizedStatus, NormalizedEventType>>>> =
  Object.freeze({
    payment: Object.freeze({
      SUCCESS: "PAYMENT_COMPLETED",
      FAILED: "PAYMENT_FAILED",
      PENDING: "PAYMENT_PENDING",
    }),
    refund: Object.freeze({
      SUCCESS: "REFUND_COMPLETED",
      FAILED: "REFUND_FAILED",
      PENDING: "REFUND_PENDING",
    }),
    mandate: Object.freeze({
      SUCCESS: "MANDATE_ACTIVATED",
      FAILED: "MANDATE_FAILED",
      PENDING: "MANDATE_PENDING",
    }),
    collection: Object.freeze({
      SUCCESS: "AUTOPAY_COLLECTION_COMPLETED",
      FAILED: "AUTOPAY_COLLECTION_FAILED",
      PENDING: "AUTOPAY_COLLECTION_PENDING",
    }),
  })

export const normalizeCallback = (
  callback: VerifiedCallback,
  now: Date,
  eventId: string = randomUUID(),
): NormalizedEvent => {
  const status = STATUS_OF[callback.outcome]
  const family = familyOf(callback.event, callback)
  return Object.freeze({
    eventId,
    type: TYPE_OF[family][status],
    status,
    merchantOrderId: callback.merchantOrderId,
    merchantRefundId: callback.merchantRefundId,
    originalMerchantOrderId: callback.originalMerchantOrderId,
    providerReference: callback.providerOrderId ?? callback.providerRefundId,
    amountPaise: callback.amountPaise,
    providerState: callback.providerState,
    providerEvent: callback.event,
    occurredAt: now.toISOString(),
    details: callback.details.map((detail) => Object.freeze({ ...detail })),
  })
}
