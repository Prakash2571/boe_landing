import { describe, expect, it } from "vitest"

import { createSessionStore } from "./sessions.js"

const NOW = 1_800_000_000_000

const input = (overrides: Partial<{ merchantOrderId: string; providerCheckoutUrl: string; now: number }> = {}) => ({
  service: "boe-dev",
  merchantOrderId: overrides.merchantOrderId ?? "boe-dev_ORDER-1",
  providerCheckoutUrl: overrides.providerCheckoutUrl
    ?? "https://mercury-t2.phonepe.com/transact/pgv3?token=abc",
  now: overrides.now ?? NOW,
})

describe("payment sessions", () => {
  it("issues an opaque high-entropy token", () => {
    const session = createSessionStore().create(input())

    expect(session.token.length).toBeGreaterThanOrEqual(43)
    expect(session.token).not.toContain(session.merchantOrderId)
    expect(session.token).toMatch(/^[A-Za-z0-9_-]+$/u)
  })

  it("binds the destination and order server-side so the browser cannot change them", () => {
    const store = createSessionStore()
    const session = store.create(input())
    const consumed = store.consume(session.token, NOW + 1_000)

    expect(consumed?.providerCheckoutUrl).toBe("https://mercury-t2.phonepe.com/transact/pgv3?token=abc")
    expect(consumed?.merchantOrderId).toBe("boe-dev_ORDER-1")
    expect(consumed?.service).toBe("boe-dev")
  })

  it("is single use", () => {
    const store = createSessionStore()
    const session = store.create(input())

    expect(store.consume(session.token, NOW + 1)).not.toBeNull()
    expect(store.consume(session.token, NOW + 2)).toBeNull()
  })

  it("expires", () => {
    const store = createSessionStore(1_000)
    const session = store.create(input())

    expect(store.consume(session.token, NOW + 1_001)).toBeNull()
  })

  it("refuses an unknown token", () => {
    expect(createSessionStore().consume("not-a-real-token", NOW)).toBeNull()
  })

  it("does not store the raw token, so a store leak is not a set of usable links", () => {
    const store = createSessionStore()
    const session = store.create(input())

    expect(store.peek(session.token)).not.toBeNull()
    expect(store.peek(`${session.token}x`)).toBeNull()
  })

  it("sweeps expired sessions rather than growing without bound", () => {
    const store = createSessionStore(1_000)
    store.create(input())
    store.create(input({ merchantOrderId: "boe-dev_ORDER-2" }))
    expect(store.size()).toBe(2)

    store.create(input({ merchantOrderId: "boe-dev_ORDER-3", now: NOW + 5_000 }))
    expect(store.size()).toBe(1)
  })

  it("gives every session a distinct token", () => {
    const store = createSessionStore()
    const tokens = new Set([
      store.create(input()).token,
      store.create(input()).token,
      store.create(input()).token,
    ])

    expect(tokens.size).toBe(3)
  })
})
