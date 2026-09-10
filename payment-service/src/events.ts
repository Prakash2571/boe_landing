import { z } from "zod"

export type CallbackKind = "payment" | "subscription" | "refund"
export type RawCallback = Readonly<{ kind: CallbackKind; rawBody: string; authorization: string }>

const REFERENCE_KEYS = ["merchantOrderId", "merchantSubscriptionId", "merchantRefundId", "originalMerchantOrderId"] as const
const REFERENCE_PATTERN = /^(?<service>boe-dev|boe-prod)_(?:order|subscription|refund)_[0-9a-f]{32}$/u
const CallbackSchema = z.object({ event: z.string().min(1), payload: z.record(z.unknown()) })
const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const referencesOf = (payload: Record<string, unknown>): readonly unknown[] => [
  ...REFERENCE_KEYS.filter((key) => payload[key] !== undefined && payload[key] !== null).map((key) => payload[key]),
  ...(isRecord(payload.paymentFlow) ? referencesOf(payload.paymentFlow) : []),
  ...(isRecord(payload.subscriptionDetails) ? referencesOf(payload.subscriptionDetails) : []),
]

export const resolveReferenceService = (payload: Record<string, unknown>, services: readonly string[]): string => {
  const references = referencesOf(payload)
  if (references.length === 0) throw new Error("callback has no merchant reference")
  const owners = references.map((reference) => {
    const service = typeof reference === "string" ? REFERENCE_PATTERN.exec(reference)?.groups?.service : undefined
    if (service === undefined || !services.includes(service)) throw new Error("unrecognized merchant reference")
    return service
  })
  const owner = owners[0]
  if (owner === undefined || owners.some((service) => service !== owner)) throw new Error("conflicting merchant references")
  return owner
}

const callbackKind = (event: string, payload: Record<string, unknown>): CallbackKind => {
  const flow = isRecord(payload.paymentFlow) ? payload.paymentFlow.type : undefined
  if (event.startsWith("pg.refund.") || event.startsWith("refund.")) return "refund"
  if (event.startsWith("subscription.") || event.startsWith("checkout.setup.") || event.startsWith("checkout.redemption.")) {
    return "subscription"
  }
  if (event.startsWith("checkout.order.")) {
    if (flow === "SUBSCRIPTION_CHECKOUT_SETUP" || flow === "SUBSCRIPTION_CHECKOUT_REDEMPTION" || flow === "SUBSCRIPTION_REDEMPTION") return "subscription"
    if (flow === undefined || flow === "PG_CHECKOUT") return "payment"
  }
  throw new Error("unsupported provider event")
}

export const resolveCallbackRoute = (rawBody: string, services: readonly string[]): Readonly<{ service: string; kind: CallbackKind }> => {
  const { event, payload } = CallbackSchema.parse(JSON.parse(rawBody))
  return Object.freeze({ service: resolveReferenceService(payload, services), kind: callbackKind(event, payload) })
}

export const deliverCallback = async (
  callbackBaseUrl: string,
  callback: RawCallback,
  timeoutMs: number,
): Promise<boolean> => {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(`${callbackBaseUrl}/${callback.kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: callback.authorization },
      body: callback.rawBody,
      signal: controller.signal,
      redirect: "error",
    })
    await response.body?.cancel()
    return response.ok
  } catch {
    return false
  } finally {
    clearTimeout(timer)
  }
}
