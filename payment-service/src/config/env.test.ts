import { describe, expect, it } from "vitest"

import { loadConfig } from "./env.js"

const SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef"

const callers = (
  entries: readonly Readonly<{ service: string; returnUrl: string }>[],
): string =>
  JSON.stringify(entries.map((entry) => ({
    service: entry.service,
    secret: SECRET,
    eventsUrl: "https://dev-app.beonedge.in/api/v1/internal/payment-events",
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
