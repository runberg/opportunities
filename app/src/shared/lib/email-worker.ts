import { db } from "./db"
import { maintainOutbox, processDueEmails } from "./email-outbox"
import { discardPendingNotifications, flushDueNotifications } from "./notify"

/**
 * In-process background job for outgoing email, started once per server process from
 * src/instrumentation.ts. Every minute it:
 *   1. turns notification batches whose delay has passed into outbox emails,
 *   2. sends due outbox emails (first attempts and scheduled retries),
 *   3. requeues interrupted sends and deletes old sent emails.
 * While notifications are switched off, waiting batches are dropped (as before) and queued
 * emails are held, not sent; an admin can still retry or discard them manually.
 */

const TICK_MS = 60_000

const state = globalThis as unknown as { emailWorkerTimer?: ReturnType<typeof setInterval> }
let ticking = false

async function tick(): Promise<void> {
  if (ticking) return // a slow SMTP server can make a tick outlast the interval
  ticking = true
  try {
    const config = await db.smtpConfig.findUnique({ where: { id: "default" }, select: { enabled: true } })
    if (config?.enabled) {
      await flushDueNotifications()
      await processDueEmails()
    } else {
      await discardPendingNotifications()
    }
    await maintainOutbox()
  } catch (err: unknown) {
    console.error("Email worker tick failed:", err)
  } finally {
    ticking = false
  }
}

export function startEmailWorker(): void {
  if (state.emailWorkerTimer) return // dev hot-reload can call register() more than once
  state.emailWorkerTimer = setInterval(() => { void tick() }, TICK_MS)
  void tick() // pick up anything left over from before a restart straight away
}
