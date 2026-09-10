import { describe, expect, it } from "vitest"

import { loadConfig } from "./env.js"

const SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef"

const callers = (
  entries: readonly Readonly<{ service: string; returnUrl: string }>[],
): string =>
  JSON.stringify(entries.map((entry) => ({
    service: entry.service,
    secret: SECRET,
    callbackBaseUrl: `https://${entry.service === "boe-prod" ? "app" : "dev-app"}.beonedge.in/api/v1/provider-events/phonepe`,
    returnUrl: entry.returnUrl,
    phonepeEnv: "production",
  })))

const env = (paymentCallers: string): NodeJS.ProcessEnv => ({
  PHONEPE_CLIENT_ID: "id",
  PHONEPE_CLIENT_SECRET: "secret",
  PHONEPE_CLIENT_VERSION: "1",
  PHONEPE_MERCHANT_ID: "M1",
  PHONEPE_CALLBACK_USERNAME: "u",
  PHONEPE_CALLBACK_PASSWORD: "p",
  PAYMENT_PUBLIC_ORIGIN: "https://www.beonedge.in",
  PAYMENT_CALLERS: paymentCallers,
})

const returnUrlOf = (paymentCallers: string, service: string): string | undefined =>
  loadConfig(env(paymentCallers)).callers.get(service)?.returnUrl

describe("caller return destinations", () => {
  it("sends the payer to the in-app return screen, not to the configured path", () => {
    expect(returnUrlOf(
      callers([{ service: "boe-dev", returnUrl: "https://dev-app.beonedge.in/dashboard" }]),
      "boe-dev",
    )).toBe("https://dev-app.beonedge.in/pay/return")
  })

  it("keeps each caller on its own origin", () => {
    const raw = callers([
      { service: "boe-dev", returnUrl: "https://dev-app.beonedge.in/dashboard" },
      { service: "boe-prod", returnUrl: "https://app.beonedge.in/dashboard" },
    ])

    expect(returnUrlOf(raw, "boe-dev")).toBe("https://dev-app.beonedge.in/pay/return")
    expect(returnUrlOf(raw, "boe-prod")).toBe("https://app.beonedge.in/pay/return")
  })

  it("discards any query or fragment-free path already configured", () => {
    expect(returnUrlOf(
      callers([{ service: "boe-dev", returnUrl: "https://dev-app.beonedge.in/dashboard?tab=funds" }]),
      "boe-dev",
    )).toBe("https://dev-app.beonedge.in/pay/return")
  })

  it("is idempotent when the return path is already configured", () => {
    expect(returnUrlOf(
      callers([{ service: "boe-dev", returnUrl: "https://dev-app.beonedge.in/pay/return" }]),
      "boe-dev",
    )).toBe("https://dev-app.beonedge.in/pay/return")
  })

  it("refuses a plaintext or credential-bearing destination", () => {
    expect(() => loadConfig(env(
      callers([{ service: "boe-dev", returnUrl: "http://dev-app.beonedge.in/pay/return" }]),
    ))).toThrow()
    expect(() => loadConfig(env(
      callers([{ service: "boe-dev", returnUrl: "https://user:pass@dev-app.beonedge.in/pay/return" }]),
    ))).toThrow()
  })
})


describe("callback destinations", () => {
  const valid = { service: "boe-prod", secret: SECRET, callbackBaseUrl: "https://app.beonedge.in/api/v1/provider-events/phonepe", returnUrl: "https://app.beonedge.in/pay/return", phonepeEnv: "production" }

  it("loads the canonical backend callback base and all ingress paths", () => {
    const loaded = loadConfig(env(JSON.stringify([valid])))
    expect(loaded.callers.get("boe-prod")?.callbackBaseUrl).toBe(valid.callbackBaseUrl)
    expect(loaded.callbackPaths.refund).toBe("/api/v1/provider-events/phonepe/refund")
  })

  it.each([
    "https://dev-app.beonedge.in/api/v1/provider-events/phonepe", "https://evil.test/api/v1/provider-events/phonepe", "https://app.beonedge.in:8443/api/v1/provider-events/phonepe",
    "http://app.beonedge.in/api/v1/provider-events/phonepe", "https://user:pass@app.beonedge.in/api/v1/provider-events/phonepe",
    "https://app.beonedge.in/api/v1/internal/payment-events", "https://app.beonedge.in/api/v1/provider-events/phonepe/",
    "https://app.beonedge.in/api/v1/provider-events/phonepe?target=dev", "https://app.beonedge.in/api/v1/provider-events/phonepe#fragment",
  ])("refuses unsafe or noncanonical callback destination %s", (callbackBaseUrl) => {
    expect(() => loadConfig(env(JSON.stringify([{ ...valid, callbackBaseUrl }])))).toThrow()
  })

  it.each(["BOE", "service_with_underscore", "service-name-too-long"])("rejects service names that cannot fit merchant references %s", (service) => {
    expect(() => loadConfig(env(JSON.stringify([{ ...valid, service }])))).toThrow()
  })
})
