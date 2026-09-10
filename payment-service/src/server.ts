import Fastify from "fastify"
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify"
import { z } from "zod"

import type { ServiceConfig } from "./config/env.js"
import { resolveCallbackRoute, resolveReferenceService } from "./events.js"
import type { RawCallback } from "./events.js"
import { verifyCallbackAuthorization } from "./provider/phonepe/phonePeCheckoutGateway.js"
import { returnUrlFor } from "./gateways.js"
import type { CallerRuntime } from "./gateways.js"
import { authenticateService } from "./http/serviceAuth.js"
import type { NonceStore } from "./http/serviceAuth.js"
import type { SessionStore } from "./sessions.js"
import {
  GatewayCredentialError,
  GatewayNotFoundError,
  GatewayRejectedError,
  GatewayThrottledError,
  GatewayUnavailableError,
} from "./provider/phonepe/paymentGateway.js"

const PAISE = /^[0-9]{1,19}$/u

const CheckoutBody = z.object({
  merchantOrderId: z.string().min(1).max(63),
  amountPaise: z.string().regex(PAISE),
  expireAfterSeconds: z.number().int().min(300).max(3600),
})

const OrderRef = z.object({ merchantOrderId: z.string().min(1).max(63) })

const RefundBody = z.object({
  merchantRefundId: z.string().min(1).max(63),
  originalMerchantOrderId: z.string().min(1).max(63),
  amountPaise: z.string().regex(PAISE),
})

const RefundRef = z.object({ merchantRefundId: z.string().min(1).max(63) })

const MandateBody = z.object({
  merchantOrderId: z.string().min(1).max(63),
  merchantSubscriptionId: z.string().min(1).max(63),
  amountPaise: z.string().regex(PAISE),
  expireAfterSeconds: z.number().int().min(300).max(3600),
  mandateExpiresAt: z.string().datetime(),
})

const SubscriptionRef = z.object({ merchantSubscriptionId: z.string().min(1).max(63) })

const CollectionBody = z.object({
  merchantOrderId: z.string().min(1).max(63),
  merchantSubscriptionId: z.string().min(1).max(63),
  amountPaise: z.string().regex(PAISE),
  expireAt: z.string().datetime(),
})

const NEW_SESSION_BLOCKED = new Set(["MAINTENANCE", "PAYMENTS_DRAINING"])

const START_PATH = "/pay/start"

export const handoffPage = (providerCheckoutUrl: string): string => {
  const target = JSON.stringify(providerCheckoutUrl)
  return [
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">",
    "<meta name=\"referrer\" content=\"strict-origin-when-cross-origin\">",
    "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">",
    "<title>Continuing to secure payment</title>",
    "<style>body{font-family:system-ui,sans-serif;margin:0;min-height:100vh;",
    "display:flex;align-items:center;justify-content:center;color:#1a1a1a}",
    "p{font-size:15px}</style></head>",
    "<body><p>Taking you to the secure payment page&hellip;</p>",
    "<script>",
    "(function(){var t=", target, ";",
    "try{window.location.replace(t)}catch(e){window.location.href=t}",
    "})();",
    "</script>",
    "<noscript><p>JavaScript is required. ",
    "<a href=\"", providerCheckoutUrl.replace(/&/gu, "&amp;").replace(/"/gu, "&quot;"),
    "\">Continue to payment</a></p></noscript>",
    "</body></html>",
  ].join("")
}

const EXPIRED_PAGE = [
  "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">",
  "<title>Payment link expired</title>",
  "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\"></head>",
  "<body><h1>This payment link has expired</h1>",
  "<p>Please return to the app and start the payment again.</p></body></html>",
].join("")

type Deps = Readonly<{
  config: ServiceConfig
  runtimes: ReadonlyMap<string, CallerRuntime>
  nonces: NonceStore
  sessions: SessionStore
  clock: () => Date
  deliver: (runtime: CallerRuntime, event: RawCallback) => Promise<boolean>
}>

const rawBodyOf = (request: FastifyRequest): string =>
  typeof request.body === "string" ? request.body : ""

const statusForGatewayError = (error: unknown): number => {
  if (error instanceof GatewayRejectedError) return 422
  if (error instanceof GatewayNotFoundError) return 404
  if (error instanceof GatewayThrottledError) return 429
  if (error instanceof GatewayCredentialError) return 502
  if (error instanceof GatewayUnavailableError) return 503
  return 500
}

export const buildServer = (deps: Deps): FastifyInstance => {
  const app = Fastify({
    logger: { level: deps.config.logLevel },
    trustProxy: true,
    bodyLimit: 256 * 1024,
  })

  app.addContentTypeParser(
    "application/json",
    { parseAs: "string" },
    (_request, body, done) => {
      done(null, body)
    },
  )

  const authenticate = (request: FastifyRequest, reply: FastifyReply): CallerRuntime | null => {
    const result = authenticateService({
      method: request.method,
      path: new URL(request.url, "http://internal").pathname,
      headers: request.headers as Record<string, string | string[] | undefined>,
      rawBody: rawBodyOf(request),
      callers: deps.config.callers,
      nonces: deps.nonces,
      windowSeconds: deps.config.replayWindowSeconds,
      now: deps.clock().getTime(),
    })
    if (!result.ok) {
      request.log.warn({ reason: result.reason }, "internal request refused")
      void reply.status(401).send({ ok: false, error: { code: "SERVICE_UNAUTHENTICATED" } })
      return null
    }
    const runtime = deps.runtimes.get(result.caller.service)
    if (runtime === undefined) {
      void reply.status(401).send({ ok: false, error: { code: "SERVICE_UNAUTHENTICATED" } })
      return null
    }
    return runtime
  }

  const parsed = <T>(schema: z.ZodType<T>, request: FastifyRequest, reply: FastifyReply, runtime: CallerRuntime): T | null => {
    let decoded: unknown
    try {
      decoded = JSON.parse(rawBodyOf(request))
    } catch {
      void reply.status(400).send({ ok: false, error: { code: "MALFORMED_BODY" } })
      return null
    }
    const result = schema.safeParse(decoded)
    if (!result.success) {
      void reply.status(400).send({ ok: false, error: { code: "INVALID_BODY" } })
      return null
    }
    try {
      resolveReferenceService(result.data as Record<string, unknown>, [runtime.caller.service])
    } catch {
      void reply.status(400).send({ ok: false, error: { code: "INVALID_MERCHANT_REFERENCE" } })
      return null
    }
    return result.data
  }

  app.get("/internal/v1/health", async () => ({
    ok: true,
    data: { maintenanceState: deps.config.maintenanceState },
  }))

  app.post("/internal/v1/payments/checkout", async (request, reply) => {
    const runtime = authenticate(request, reply)
    if (runtime === null) return
    if (NEW_SESSION_BLOCKED.has(deps.config.maintenanceState)) {
      return reply.status(503).send({
        ok: false,
        error: { code: "PAYMENTS_UNAVAILABLE", maintenanceState: deps.config.maintenanceState },
      })
    }
    const body = parsed(CheckoutBody, request, reply, runtime)
    if (body === null) return

    try {
      const created = await runtime.gateway.createCheckout({
        merchantOrderId: body.merchantOrderId,
        amountPaise: body.amountPaise,
        redirectUrl: null,
        expireAfterSeconds: body.expireAfterSeconds,
      })
      request.log.info(
        { merchantOrderId: body.merchantOrderId, providerOrderId: created.providerOrderId },
        "checkout created",
      )
      const session = deps.sessions.create({
        service: runtime.caller.service,
        merchantOrderId: body.merchantOrderId,
        providerCheckoutUrl: created.redirectUrl,
        now: deps.clock().getTime(),
      })
      return reply.status(200).send({
        ok: true,
        data: {
          state: "CHECKOUT_CREATED",
          merchantOrderId: body.merchantOrderId,
          checkoutUrl: `${deps.config.publicOrigin}${START_PATH}?t=${session.token}`,
          providerReference: created.providerOrderId,
          expiresAt: created.expiresAt === null ? null : created.expiresAt.toISOString(),
        },
      })
    } catch (error) {
      request.log.error(
        { merchantOrderId: body.merchantOrderId, err: (error as Error).name },
        "checkout creation failed",
      )
      return reply.status(statusForGatewayError(error)).send({
        ok: false,
        error: { code: "PROVIDER_CHECKOUT_FAILED" },
      })
    }
  })

  app.post("/internal/v1/payments/status", async (request, reply) => {
    const runtime = authenticate(request, reply)
    if (runtime === null) return
    const body = parsed(OrderRef, request, reply, runtime)
    if (body === null) return

    try {
      const fact = await runtime.gateway.getOrderStatus(body.merchantOrderId)
      return reply.status(200).send({
        ok: true,
        data: {
          merchantOrderId: fact.merchantOrderId ?? body.merchantOrderId,
          status: fact.outcome === "succeeded" ? "SUCCESS" : fact.outcome === "failed" ? "FAILED" : "PENDING",
          providerState: fact.providerState,
          providerReference: fact.providerOrderId,
          amountPaise: fact.amountPaise,
          currency: fact.currency,
          details: fact.details,
        },
      })
    } catch (error) {
      return reply.status(statusForGatewayError(error)).send({
        ok: false,
        error: { code: "PROVIDER_STATUS_FAILED" },
      })
    }
  })

  app.post("/internal/v1/payments/refund", async (request, reply) => {
    const runtime = authenticate(request, reply)
    if (runtime === null) return
    const body = parsed(RefundBody, request, reply, runtime)
    if (body === null) return

    try {
      const initiated = await runtime.gateway.initiateRefund(body)
      return reply.status(200).send({
        ok: true,
        data: {
          merchantRefundId: body.merchantRefundId,
          status: initiated.outcome === "succeeded" ? "SUCCESS" : initiated.outcome === "failed" ? "FAILED" : "PENDING",
          providerState: initiated.providerState,
          providerReference: initiated.providerRefundId,
        },
      })
    } catch (error) {
      return reply.status(statusForGatewayError(error)).send({
        ok: false,
        error: { code: "PROVIDER_REFUND_FAILED" },
      })
    }
  })

  app.post("/internal/v1/payments/refund-status", async (request, reply) => {
    const runtime = authenticate(request, reply)
    if (runtime === null) return
    const body = parsed(RefundRef, request, reply, runtime)
    if (body === null) return

    try {
      const fact = await runtime.gateway.getRefundStatus(body.merchantRefundId)
      return reply.status(200).send({
        ok: true,
        data: {
          merchantRefundId: fact.merchantRefundId,
          originalMerchantOrderId: fact.originalMerchantOrderId,
          status: fact.outcome === "succeeded" ? "SUCCESS" : fact.outcome === "failed" ? "FAILED" : "PENDING",
          providerState: fact.providerState,
          providerReference: fact.providerRefundId,
          amountPaise: fact.amountPaise,
        },
      })
    } catch (error) {
      return reply.status(statusForGatewayError(error)).send({
        ok: false,
        error: { code: "PROVIDER_REFUND_STATUS_FAILED" },
      })
    }
  })

  app.post("/internal/v1/autopay/mandates", async (request, reply) => {
    const runtime = authenticate(request, reply)
    if (runtime === null) return
    if (NEW_SESSION_BLOCKED.has(deps.config.maintenanceState)) {
      return reply.status(503).send({
        ok: false,
        error: { code: "PAYMENTS_UNAVAILABLE", maintenanceState: deps.config.maintenanceState },
      })
    }
    const body = parsed(MandateBody, request, reply, runtime)
    if (body === null) return

    try {
      const created = await runtime.recurring.createMandateCheckout({
        merchantOrderId: body.merchantOrderId,
        merchantSubscriptionId: body.merchantSubscriptionId,
        amountPaise: body.amountPaise,
        expireAfterSeconds: body.expireAfterSeconds,
        mandateExpiresAt: new Date(body.mandateExpiresAt),
        redirectUrl: returnUrlFor(deps.config, runtime.caller.service),
      })
      const session = deps.sessions.create({
        service: runtime.caller.service,
        merchantOrderId: body.merchantOrderId,
        providerCheckoutUrl: created.redirectUrl,
        now: deps.clock().getTime(),
      })
      request.log.info(
        { merchantOrderId: body.merchantOrderId, providerOrderId: created.providerOrderId },
        "mandate checkout created",
      )
      return reply.status(200).send({
        ok: true,
        data: {
          state: "MANDATE_CHECKOUT_CREATED",
          merchantOrderId: body.merchantOrderId,
          merchantSubscriptionId: body.merchantSubscriptionId,
          checkoutUrl: `${deps.config.publicOrigin}${START_PATH}?t=${session.token}`,
          providerReference: created.providerOrderId,
          providerState: created.providerState,
          expiresAt: created.expiresAt.toISOString(),
        },
      })
    } catch (error) {
      request.log.error(
        { merchantOrderId: body.merchantOrderId, err: (error as Error).name },
        "mandate checkout failed",
      )
      return reply.status(statusForGatewayError(error))
        .send({ ok: false, error: { code: "PROVIDER_MANDATE_FAILED" } })
    }
  })

  app.post("/internal/v1/autopay/mandates/setup-status", async (request, reply) => {
    const runtime = authenticate(request, reply)
    if (runtime === null) return
    const body = parsed(OrderRef, request, reply, runtime)
    if (body === null) return
    try {
      const fact = await runtime.recurring.getSetupOrderStatus(body.merchantOrderId)
      return reply.status(200).send({ ok: true, data: fact })
    } catch (error) {
      return reply.status(statusForGatewayError(error))
        .send({ ok: false, error: { code: "PROVIDER_MANDATE_STATUS_FAILED" } })
    }
  })

  app.post("/internal/v1/autopay/mandates/status", async (request, reply) => {
    const runtime = authenticate(request, reply)
    if (runtime === null) return
    const body = parsed(SubscriptionRef, request, reply, runtime)
    if (body === null) return
    try {
      const fact = await runtime.recurring.getMandateStatus(body.merchantSubscriptionId)
      return reply.status(200).send({ ok: true, data: fact })
    } catch (error) {
      return reply.status(statusForGatewayError(error))
        .send({ ok: false, error: { code: "PROVIDER_MANDATE_STATUS_FAILED" } })
    }
  })

  app.post("/internal/v1/autopay/mandates/cancel", async (request, reply) => {
    const runtime = authenticate(request, reply)
    if (runtime === null) return
    const body = parsed(SubscriptionRef, request, reply, runtime)
    if (body === null) return
    try {
      await runtime.recurring.cancelMandate(body.merchantSubscriptionId)
      request.log.info({ merchantSubscriptionId: body.merchantSubscriptionId }, "mandate cancelled")
      return reply.status(200).send({
        ok: true,
        data: { state: "CANCEL_REQUESTED", merchantSubscriptionId: body.merchantSubscriptionId },
      })
    } catch (error) {
      return reply.status(statusForGatewayError(error))
        .send({ ok: false, error: { code: "PROVIDER_MANDATE_CANCEL_FAILED" } })
    }
  })

  app.post("/internal/v1/autopay/collections", async (request, reply) => {
    const runtime = authenticate(request, reply)
    if (runtime === null) return
    if (NEW_SESSION_BLOCKED.has(deps.config.maintenanceState)) {
      return reply.status(503).send({
        ok: false,
        error: { code: "PAYMENTS_UNAVAILABLE", maintenanceState: deps.config.maintenanceState },
      })
    }
    const body = parsed(CollectionBody, request, reply, runtime)
    if (body === null) return
    try {
      const notified = await runtime.recurring.notifyCollection({
        merchantOrderId: body.merchantOrderId,
        merchantSubscriptionId: body.merchantSubscriptionId,
        amountPaise: body.amountPaise,
        expireAt: new Date(body.expireAt),
      })
      request.log.info(
        { merchantOrderId: body.merchantOrderId, providerOrderId: notified.providerOrderId },
        "collection notified",
      )
      return reply.status(200).send({
        ok: true,
        data: {
          state: "COLLECTION_NOTIFIED",
          merchantOrderId: body.merchantOrderId,
          providerReference: notified.providerOrderId,
          providerState: notified.providerState,
          expiresAt: notified.expiresAt.toISOString(),
        },
      })
    } catch (error) {
      request.log.error(
        { merchantOrderId: body.merchantOrderId, err: (error as Error).name },
        "collection notification failed",
      )
      return reply.status(statusForGatewayError(error))
        .send({ ok: false, error: { code: "PROVIDER_COLLECTION_FAILED" } })
    }
  })

  app.post("/internal/v1/autopay/collections/status", async (request, reply) => {
    const runtime = authenticate(request, reply)
    if (runtime === null) return
    const body = parsed(OrderRef, request, reply, runtime)
    if (body === null) return
    try {
      const fact = await runtime.recurring.getCollectionStatus(body.merchantOrderId)
      return reply.status(200).send({
        ok: true,
        data: { ...fact, expiresAt: fact.expiresAt.toISOString() },
      })
    } catch (error) {
      return reply.status(statusForGatewayError(error))
        .send({ ok: false, error: { code: "PROVIDER_COLLECTION_STATUS_FAILED" } })
    }
  })

  app.get(START_PATH, async (request, reply) => {
    const query = request.query as Record<string, unknown>
    const token = typeof query.t === "string" ? query.t : ""
    const session = token === "" ? null : deps.sessions.consume(token, deps.clock().getTime())
    if (session === null) {
      request.log.warn("payment start refused: unknown, expired or reused token")
      return reply.status(410).type("text/html; charset=utf-8").send(EXPIRED_PAGE)
    }
    request.log.info(
      { merchantOrderId: session.merchantOrderId, service: session.service },
      "payer handed to the provider from the approved origin",
    )
    return reply
      .status(200)
      .type("text/html; charset=utf-8")
      .header("Cache-Control", "no-store")
      .header("Referrer-Policy", "strict-origin-when-cross-origin")
      .send(handoffPage(session.providerCheckoutUrl))
  })

  const handleProviderEvent = async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<FastifyReply> => {
    const authorization = request.headers.authorization
    if (typeof authorization !== "string" || authorization.length === 0) {
      return reply.status(401).send({ ok: false, error: { code: "PROVIDER_CALLBACK_UNVERIFIED" } })
    }
    if (!verifyCallbackAuthorization(deps.config.phonepe.callbackUsername, deps.config.phonepe.callbackPassword, authorization)) {
      return reply.status(401).send({ ok: false, error: { code: "PROVIDER_CALLBACK_UNVERIFIED" } })
    }
    const rawBody = rawBodyOf(request)
    let route
    try {
      route = resolveCallbackRoute(rawBody, [...deps.runtimes.keys()])
    } catch {
      request.log.warn("provider callback has no unambiguous supported destination")
      return reply.status(400).send({ ok: false, error: { code: "PROVIDER_CALLBACK_UNROUTABLE" } })
    }
    const target = deps.runtimes.get(route.service)
    if (target === undefined) {
      return reply.status(503).send({ ok: false, error: { code: "EVENT_NOT_DELIVERED" } })
    }
    request.log.info({ service: route.service, kind: route.kind }, "provider callback verified")
    let delivered = false
    try {
      delivered = await deps.deliver(target, { kind: route.kind, rawBody, authorization })
    } catch {
      request.log.error({ service: route.service }, "callback transport failed")
    }
    if (!delivered) {
      request.log.error({ service: route.service }, "callback delivery failed; asking the provider to retry")
      return reply.status(503).send({ ok: false, error: { code: "EVENT_NOT_DELIVERED" } })
    }
    return reply.status(200).send({ ok: true })
  }

  app.post(deps.config.callbackPaths.payment, handleProviderEvent)
  app.post(deps.config.callbackPaths.subscription, handleProviderEvent)
  app.post(deps.config.callbackPaths.refund, handleProviderEvent)

  app.get(deps.config.returnPath, async (request, reply) => {
    reply.header("Cache-Control", "no-store")
    const query = request.query as Record<string, unknown>
    const service = typeof query.s === "string" ? query.s : null
    const target = service === null ? undefined : deps.runtimes.get(service)
    if (target === undefined) {
      return reply.status(400).type("text/plain").send(
        "This payment return link is incomplete. Return to the BeOnEdge app to check your payment.",
      )
    }
    return reply.redirect(target.caller.returnUrl, 302)
  })

  return app
}
