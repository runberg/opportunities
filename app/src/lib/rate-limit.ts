/**
 * In-memory login rate limiter keyed by email address.
 * Works for single-server deployments. For multi-instance deployments, replace
 * the Map with a shared Redis store.
 *
 * Policy: 5 failed attempts within a 15-minute window → 15-minute lockout.
 */

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000  // 15 min sliding window
const BLOCK_MS  = 15 * 60 * 1000  // 15 min lockout after MAX_ATTEMPTS

interface Entry {
  count: number
  firstAt: number
  blockedUntil: number | null
}

const store = new Map<string, Entry>()

export function checkRateLimit(key: string): { allowed: boolean; retryAfterSeconds?: number } {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry) return { allowed: true }

  // Active block
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, retryAfterSeconds: Math.ceil((entry.blockedUntil - now) / 1000) }
  }

  // Window expired — treat as fresh
  if (now - entry.firstAt > WINDOW_MS) {
    store.delete(key)
    return { allowed: true }
  }

  return { allowed: true }
}

export function recordFailure(key: string): void {
  const now = Date.now()
  const entry = store.get(key)

  if (!entry || now - entry.firstAt > WINDOW_MS) {
    store.set(key, { count: 1, firstAt: now, blockedUntil: null })
    return
  }

  const count = entry.count + 1
  store.set(key, {
    count,
    firstAt: entry.firstAt,
    blockedUntil: count >= MAX_ATTEMPTS ? now + BLOCK_MS : null,
  })
}

export function clearAttempts(key: string): void {
  store.delete(key)
}
