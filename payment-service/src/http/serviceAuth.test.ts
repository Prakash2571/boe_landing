import { describe, expect, it } from "vitest"

import type { CallerConfig } from "../config/env.js"
import {
  NONCE_HEADER,
  SERVICE_HEADER,
  SIGNATURE_HEADER,
  TIMESTAMP_HEADER,
  authenticateService,
  createNonceStore,
  sign,
} from "./serviceAuth.js"

const SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef"
const NOW = 1_800_000_000_000

const caller: CallerConfig = Object.freeze({
  service: "boe-dev",
  secret: SECRET,
  eventsUrl: "https://dev-app.beonedge.in/api/v1/internal/payment-events",
  returnUrl: "https://dev-app.beonedge.in/dashboard",
  phonepeEnv: "production",
})

const callers = new Map<string, CallerConfig>([[caller.service, caller]])

const request = (overrides: Partial<{
  method: string
  path: string
  body: string
  service: string
  timestamp: string
  nonce: string
  signature: string
  now: number
}> = {}) => {
  const method = overrides.method ?? "POST"
  const path = overrides.path ?? "/internal/v1/payments/checkout"
  const body = overrides.body ?? '{"merchantOrderId":"BOE-1"}'
  const timestamp = overrides.timestamp ?? String(NOW)
  const nonce = overrides.nonce ?? "nonce-1"
  const signature = overrides.signature ?? sign(SECRET, method, path, timestamp, nonce, body)
  return {
    method,
    path,
    rawBody: body,
    headers: {
      [SERVICE_HEADER]: overrides.service ?? caller.service,
      [TIMESTAMP_HEADER]: timestamp,
      [NONCE_HEADER]: nonce,
      [SIGNATURE_HEADER]: signature,
    },
    callers,
    nonces: createNonceStore(300),
    windowSeconds: 300,
    now: overrides.now ?? NOW,
  }
}

describe("service authentication", () => {
  it("accepts a correctly signed request", () => {
    expect(authenticateService(request())).toStrictEqual({ ok: true, caller })
  })

  it("refuses an unknown service", () => {
    expect(authenticateService(request({ service: "stranger" })))
      .toStrictEqual({ ok: false, reason: "unknown-service" })
  })

  it("refuses a missing header", () => {
    const base = request()
    const headers = { ...base.headers }
    delete headers[SIGNATURE_HEADER]
    expect(authenticateService({ ...base, headers }))
      .toStrictEqual({ ok: false, reason: "missing-headers" })
  })

  it("refuses a stale timestamp in either direction", () => {
    expect(authenticateService(request({ now: NOW + 301_000 })))
      .toStrictEqual({ ok: false, reason: "stale-timestamp" })
    expect(authenticateService(request({ now: NOW - 301_000 })))
      .toStrictEqual({ ok: false, reason: "stale-timestamp" })
  })

  it("refuses a non-numeric timestamp", () => {
    expect(authenticateService(request({ timestamp: "yesterday" })))
      .toStrictEqual({ ok: false, reason: "stale-timestamp" })
  })

  it("refuses a tampered body", () => {
    const base = request()
    expect(authenticateService({ ...base, rawBody: '{"merchantOrderId":"BOE-2"}' }))
      .toStrictEqual({ ok: false, reason: "bad-signature" })
  })

  it("refuses a tampered path, so a signature cannot be replayed onto another route", () => {
    const base = request()
    expect(authenticateService({ ...base, path: "/internal/v1/payments/refund" }))
      .toStrictEqual({ ok: false, reason: "bad-signature" })
  })

  it("refuses a tampered method", () => {
    const base = request()
    expect(authenticateService({ ...base, method: "DELETE" }))
      .toStrictEqual({ ok: false, reason: "bad-signature" })
  })

  it("refuses a signature made with another secret", () => {
    expect(authenticateService(request({
      signature: sign("f".repeat(48), "POST", "/internal/v1/payments/checkout", String(NOW), "nonce-1", '{"merchantOrderId":"BOE-1"}'),
    }))).toStrictEqual({ ok: false, reason: "bad-signature" })
  })

  it("refuses a reused nonce", () => {
    const nonces = createNonceStore(300)
    const first = { ...request(), nonces }
    expect(authenticateService(first).ok).toBe(true)
    expect(authenticateService(first)).toStrictEqual({ ok: false, reason: "replayed-nonce" })
  })

  it("scopes the nonce to the service, so two callers may use the same value", () => {
    const other: CallerConfig = { ...caller, service: "boe-prod" }
    const nonces = createNonceStore(300)
    const both = new Map<string, CallerConfig>([
      [caller.service, caller],
      [other.service, other],
    ])
    const one = { ...request(), callers: both, nonces }
    expect(authenticateService(one).ok).toBe(true)
    const two = { ...request({ service: other.service }), callers: both, nonces }
    expect(authenticateService(two).ok).toBe(true)
  })

  it("evicts nonces once they fall outside the window", () => {
    const nonces = createNonceStore(300)
    expect(authenticateService({ ...request(), nonces }).ok).toBe(true)
    const later = NOW + 301_000
    const fresh = request({ timestamp: String(later), now: later })
    expect(authenticateService({ ...fresh, nonces }).ok).toBe(true)
  })
})
