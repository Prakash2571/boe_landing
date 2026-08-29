import { createHash, createHmac, timingSafeEqual } from "node:crypto"

import type { CallerConfig } from "../config/env.js"

export const SERVICE_HEADER = "x-boe-service"
export const TIMESTAMP_HEADER = "x-boe-timestamp"
export const NONCE_HEADER = "x-boe-nonce"
export const SIGNATURE_HEADER = "x-boe-signature"

export type AuthFailure =
  | "unknown-service"
  | "missing-headers"
  | "stale-timestamp"
  | "replayed-nonce"
  | "bad-signature"

export type AuthResult =
  | Readonly<{ ok: true; caller: CallerConfig }>
  | Readonly<{ ok: false; reason: AuthFailure }>

export const signingString = (
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  rawBody: string,
): string =>
  [
    method.toUpperCase(),
    path,
    timestamp,
    nonce,
    createHash("sha256").update(rawBody, "utf8").digest("hex"),
  ].join("\n")

export const sign = (
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  nonce: string,
  rawBody: string,
): string =>
  createHmac("sha256", secret)
    .update(signingString(method, path, timestamp, nonce, rawBody), "utf8")
    .digest("hex")

const equal = (a: string, b: string): boolean => {
  const left = Buffer.from(a, "utf8")
  const right = Buffer.from(b, "utf8")
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export type NonceStore = Readonly<{
  seen: (service: string, nonce: string, now: number) => boolean
}>

export const createNonceStore = (windowSeconds: number): NonceStore => {
  const entries = new Map<string, number>()
  return Object.freeze({
    seen: (service, nonce, now) => {
      const cutoff = now - windowSeconds * 1_000
      for (const [key, at] of entries) {
        if (at < cutoff) entries.delete(key)
      }
      const key = `${service}:${nonce}`
      if (entries.has(key)) return true
      entries.set(key, now)
      return false
    },
  })
}

export type AuthenticateInput = Readonly<{
  method: string
  path: string
  headers: Readonly<Record<string, string | string[] | undefined>>
  rawBody: string
  callers: ReadonlyMap<string, CallerConfig>
  nonces: NonceStore
  windowSeconds: number
  now: number
}>

const header = (
  headers: AuthenticateInput["headers"],
  name: string,
): string | null => {
  const value = headers[name]
  if (typeof value === "string" && value.length > 0) return value
  return null
}

export const authenticateService = (input: AuthenticateInput): AuthResult => {
  const service = header(input.headers, SERVICE_HEADER)
  const timestamp = header(input.headers, TIMESTAMP_HEADER)
  const nonce = header(input.headers, NONCE_HEADER)
  const signature = header(input.headers, SIGNATURE_HEADER)

  if (service === null || timestamp === null || nonce === null || signature === null) {
    return { ok: false, reason: "missing-headers" }
  }

  const caller = input.callers.get(service)
  if (caller === undefined) return { ok: false, reason: "unknown-service" }

  const at = Number(timestamp)
  if (!Number.isFinite(at)) return { ok: false, reason: "stale-timestamp" }
  if (Math.abs(input.now - at) > input.windowSeconds * 1_000) {
    return { ok: false, reason: "stale-timestamp" }
  }

  const expected = sign(caller.secret, input.method, input.path, timestamp, nonce, input.rawBody)
  if (!equal(expected, signature)) return { ok: false, reason: "bad-signature" }

  if (input.nonces.seen(service, nonce, input.now)) {
    return { ok: false, reason: "replayed-nonce" }
  }

  return { ok: true, caller }
}
