import { randomBytes, createHash } from "node:crypto"

export type PaymentSession = Readonly<{
  token: string
  service: string
  merchantOrderId: string
  providerCheckoutUrl: string
  createdAt: number
  expiresAt: number
  consumedAt: number | null
}>

export type SessionStore = Readonly<{
  create: (input: Readonly<{
    service: string
    merchantOrderId: string
    providerCheckoutUrl: string
    now: number
  }>) => PaymentSession
  consume: (token: string, now: number) => PaymentSession | null
  peek: (token: string) => PaymentSession | null
  size: () => number
}>

export const SESSION_TTL_MS = 15 * 60 * 1_000

const fingerprint = (token: string): string =>
  createHash("sha256").update(token, "utf8").digest("hex")

export const createSessionStore = (ttlMs: number = SESSION_TTL_MS): SessionStore => {
  const sessions = new Map<string, PaymentSession>()

  const sweep = (now: number): void => {
    for (const [key, session] of sessions) {
      if (session.expiresAt < now) sessions.delete(key)
    }
  }

  return Object.freeze({
    create: ({ service, merchantOrderId, providerCheckoutUrl, now }) => {
      sweep(now)
      const token = randomBytes(32).toString("base64url")
      const session: PaymentSession = Object.freeze({
        token,
        service,
        merchantOrderId,
        providerCheckoutUrl,
        createdAt: now,
        expiresAt: now + ttlMs,
        consumedAt: null,
      })
      sessions.set(fingerprint(token), session)
      return session
    },

    consume: (token, now) => {
      const key = fingerprint(token)
      const session = sessions.get(key)
      if (session === undefined) return null
      if (session.expiresAt < now) {
        sessions.delete(key)
        return null
      }
      if (session.consumedAt !== null) return null
      const consumed: PaymentSession = Object.freeze({ ...session, consumedAt: now })
      sessions.set(key, consumed)
      return consumed
    },

    peek: (token) => sessions.get(fingerprint(token)) ?? null,

    size: () => sessions.size,
  })
}
