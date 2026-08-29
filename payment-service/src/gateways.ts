import type { CallerConfig, ServiceConfig } from "./config/env.js"
import { createPhonePeGateway } from "./provider/phonepe/phonePeCheckoutGateway.js"
import type { PaymentGateway } from "./provider/phonepe/paymentGateway.js"

export const CHECKOUT_ALLOWED_ORIGINS: readonly string[] = Object.freeze([
  "https://mercury.phonepe.com",
  "https://mercury-t2.phonepe.com",
  "https://mercury-uat.phonepe.com",
])

export type CallerRuntime = Readonly<{
  caller: CallerConfig
  gateway: PaymentGateway
}>

export const buildRuntimes = (config: ServiceConfig): ReadonlyMap<string, CallerRuntime> => {
  const runtimes = new Map<string, CallerRuntime>()
  for (const caller of config.callers.values()) {
    runtimes.set(caller.service, Object.freeze({
      caller,
      gateway: createPhonePeGateway({
        config: {
          clientId: config.phonepe.clientId,
          clientSecret: config.phonepe.clientSecret,
          clientVersion: config.phonepe.clientVersion,
          env: caller.phonepeEnv,
          callbackUsername: config.phonepe.callbackUsername,
          callbackPassword: config.phonepe.callbackPassword,
          callbackUrl: `${config.publicOrigin}${config.callbackPaths.payment}`,
          checkoutRedirectUrl: `${config.publicOrigin}${config.returnPath}`,
          checkoutAllowedOrigins: CHECKOUT_ALLOWED_ORIGINS,
          requestTimeoutMs: config.phonepe.requestTimeoutMs,
        },
      }),
    }))
  }
  return runtimes
}
