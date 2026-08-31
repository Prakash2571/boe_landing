import { describe, expect, it } from "vitest"

import {
  GatewayNotFoundError,
  GatewayRejectedError,
} from "./paymentGateway.js"
import { createPhonePeRecurringGateway } from "./phonePeRecurringGateway.js"

const NOW = 1_800_000_000_000

const OAUTH_BODY = JSON.stringify({
  access_token: "token",
  token_type: "O-Bearer",
  expires_at: Math.floor(NOW / 1000) + 3600,
})

const gatewayAnswering = (status: number, body: string) =>
  createPhonePeRecurringGateway({
    config: {
      clientId: "client",
      clientSecret: "secret",
      clientVersion: "1",
      env: "production",
      requestTimeoutMs: 1_000,
    },
    checkoutAllowedOrigins: ["https://mercury-t2.phonepe.com"],
    clock: () => new Date(NOW),
    httpClient: async (url) =>
      url.includes("/oauth/token")
        ? new Response(OAUTH_BODY, { status: 200, headers: { "Content-Type": "application/json" } })
        : new Response(body, { status, headers: { "Content-Type": "application/json" } }),
  })

describe("PhonePe recurring gateway error classification", () => {
  it("treats a 400 ORDER_NOT_FOUND as not found so a wedged setup can be expired", async () => {
    const gateway = gatewayAnswering(400, JSON.stringify({
      success: false,
      code: "ORDER_NOT_FOUND",
      message: "No entry found for M23X2SH2ZC4S1, boe_abc",
    }))

    await expect(gateway.getSetupOrderStatus("boe_abc")).rejects.toBeInstanceOf(GatewayNotFoundError)
  })

  it("treats a 400 SUBSCRIPTION_NOT_FOUND as not found", async () => {
    const gateway = gatewayAnswering(400, JSON.stringify({
      success: false,
      code: "SUBSCRIPTION_NOT_FOUND",
      message: "No such subscription",
    }))

    await expect(gateway.getMandateStatus("boesub_abc")).rejects.toBeInstanceOf(GatewayNotFoundError)
  })

  it("still rejects a 400 that is not a not-found so a bad request is never mistaken for a missing order", async () => {
    const gateway = gatewayAnswering(400, JSON.stringify({
      success: false,
      code: "BAD_REQUEST",
      message: "amount is invalid",
    }))

    await expect(gateway.getSetupOrderStatus("boe_abc")).rejects.toBeInstanceOf(GatewayRejectedError)
  })
})
