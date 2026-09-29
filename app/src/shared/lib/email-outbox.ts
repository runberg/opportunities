import type { Prisma } from "@prisma/client"
import { db } from "./db"
import { sendMail } from "./mailer"

/**
 * Durable outgoing email queue.
 *
 * Every notification email is written to EmailOutbox before it is sent, so a failed send
 * is recorded instead of lost. The background worker (email-worker.ts) sends due rows and
 * retries failures on RETRY_DELAYS_MINUTES; once those run out the row is marked FAILED and
 * waits for an admin to retry or discard it from Admin → Email / SMTP.
 *
 * Status flow: PENDING → SENDING → SENT
 *                               ↘ PENDING (retry scheduled) … → FAILED
 * Rows are claimed with a conditional update (PENDING/FAILED → SENDING) so the worker and a
 * manual retry can never send the same email twice concurrently.
 */

/** Wait after the 1st, 2nd, … failed attempt. 9 attempts in total, spanning about 23½ hours. */
export const RETRY_DELAYS_MINUTES = [1, 5, 15, 60, 120, 240, 480, 480] as const
export const MAX_ATTEMPTS = RETRY_DELAYS_MINUTES.length + 1

/** Sent emails are deleted after this long; failed ones are kept until an admin acts. */
const SENT_RETENTION_DAYS = 30

/** A row left in SENDING this long was interrupted (e.g. a restart mid-send). */
const STALE_SENDING_MINUTES = 10

/** Upper bound per worker tick / manual "retry all", so one run can't hold the process for long. */
const BATCH_SIZE = 50

const MAX_ERROR_LENGTH = 500

export interface OutboxEmail {
  to: string
  subject: string
  html: string
  text: string
  module?: string
  itemId?: string
}

export type SendResult = "sent" | "retrying" | "failed" | "skipped"

/** Queues emails for the worker to send on its next tick. Pass `tx` to queue them atomically
 * with other writes. */
export async function enqueueEmails(emails: OutboxEmail[], tx: Prisma.TransactionClient = db): Promise<void> {
  if (emails.length === 0) return
  await tx.emailOutbox.createMany({ data: emails })
}

function errorMessage(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err)
  return message.slice(0, MAX_ERROR_LENGTH)
}

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000)
}

/**
 * Claims one row and attempts delivery. `fromStatus` is the status the caller expects the
 * row to be in; if another sender got there first the claim fails and nothing is sent.
 * With `autoRetry`, a failure schedules the next attempt; without it (manual retry) the row
 * goes straight back to FAILED so the admin sees the outcome immediately.
 */
async function attemptSend(id: string, fromStatus: "PENDING" | "FAILED", autoRetry: boolean): Promise<SendResult> {
  const claim = await db.emailOutbox.updateMany({
    where: { id, status: fromStatus },
    data: { status: "SENDING" },
  })
  if (claim.count === 0) return "skipped"

  const email = await db.emailOutbox.findUnique({ where: { id } })
  if (!email) return "skipped"

  try {
    await sendMail({ to: email.to, subject: email.subject, html: email.html, text: email.text })
    await db.emailOutbox.update({
      where: { id },
      data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, lastError: null },
    })
    return "sent"
  } catch (err: unknown) {
    const attempts = email.attempts + 1
    const retryDelay = autoRetry ? RETRY_DELAYS_MINUTES[attempts - 1] : undefined
    await db.emailOutbox.update({
      where: { id },
      data: {
        attempts,
        lastError: errorMessage(err),
        status: retryDelay === undefined ? "FAILED" : "PENDING",
        ...(retryDelay !== undefined && { nextAttemptAt: minutesFromNow(retryDelay) }),
      },
    })
    return retryDelay === undefined ? "failed" : "retrying"
  }
}

/** Sends every PENDING email that is due. Called by the worker. */
export async function processDueEmails(): Promise<void> {
  const due = await db.emailOutbox.findMany({
    where: { status: "PENDING", nextAttemptAt: { lte: new Date() } },
    orderBy: { nextAttemptAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true },
  })
  for (const { id } of due) {
    await attemptSend(id, "PENDING", true)
  }
}

/** Manually retries FAILED emails (all of them when `ids` is omitted). Each gets one
 * immediate attempt; a failure leaves it FAILED with the new error. */
export async function retryFailedEmails(ids?: string[]): Promise<Record<SendResult, number>> {
  const failed = await db.emailOutbox.findMany({
    where: { status: "FAILED", ...(ids && { id: { in: ids } }) },
    orderBy: { createdAt: "asc" },
    take: BATCH_SIZE,
    select: { id: true },
  })
  const totals: Record<SendResult, number> = { sent: 0, retrying: 0, failed: 0, skipped: 0 }
  for (const { id } of failed) {
    totals[await attemptSend(id, "FAILED", false)]++
  }
  return totals
}

/** Deletes queued (PENDING/FAILED) emails an admin has chosen not to send. */
export async function discardEmails(ids: string[]): Promise<number> {
  const { count } = await db.emailOutbox.deleteMany({
    where: { id: { in: ids }, status: { in: ["PENDING", "FAILED"] } },
  })
  return count
}

/** Housekeeping: requeue rows orphaned in SENDING and drop old sent emails. */
export async function maintainOutbox(): Promise<void> {
  await db.emailOutbox.updateMany({
    where: { status: "SENDING", updatedAt: { lt: minutesFromNow(-STALE_SENDING_MINUTES) } },
    data: { status: "PENDING", nextAttemptAt: new Date() },
  })
  await db.emailOutbox.deleteMany({
    where: { status: "SENT", sentAt: { lt: minutesFromNow(-SENT_RETENTION_DAYS * 24 * 60) } },
  })
}

export interface QueuedEmail {
  id: string
  to: string
  subject: string
  status: "PENDING" | "SENDING" | "FAILED"
  attempts: number
  lastError: string | null
  nextAttemptAt: string
  createdAt: string
}

/** Emails not yet sent (waiting, being sent, or failed), newest first — for the admin queue. */
export async function listQueuedEmails(limit = 200): Promise<QueuedEmail[]> {
  const rows = await db.emailOutbox.findMany({
    where: { status: { in: ["PENDING", "SENDING", "FAILED"] } },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, to: true, subject: true, status: true, attempts: true, lastError: true, nextAttemptAt: true, createdAt: true },
  })
  return rows.map((r) => ({
    ...r,
    status: r.status as QueuedEmail["status"],
    nextAttemptAt: r.nextAttemptAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }))
}

export function countFailedEmails(): Promise<number> {
  return db.emailOutbox.count({ where: { status: "FAILED" } })
}
