import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/shared/lib/api"
import { discardEmails, listQueuedEmails, retryFailedEmails } from "@/shared/lib/email-outbox"
import { writeLog } from "@/shared/lib/system-log"

const idsSchema = z.array(z.string().min(1).max(64)).min(1).max(200)

const retrySchema = z.object({ ids: idsSchema.optional() })
const discardSchema = z.object({ ids: idsSchema })

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error
  return NextResponse.json(await listQueuedEmails())
}

/** Retry failed emails now: the given ids, or every failed email when ids is omitted. */
export async function POST(req: NextRequest) {
  const { error, session } = await requireAdmin()
  if (error) return error

  const parsed = retrySchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  const result = await retryFailedEmails(parsed.data.ids)
  await writeLog({
    type: "SMTP_UPDATED",
    message: `Email retry: ${result.sent} sent, ${result.failed} still failing`,
    userId: session.user.id,
  })
  return NextResponse.json(result)
}

/** Discard queued (pending or failed) emails so they are never sent. */
export async function DELETE(req: NextRequest) {
  const { error, session } = await requireAdmin()
  if (error) return error

  const parsed = discardSchema.safeParse(await req.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 })

  const discarded = await discardEmails(parsed.data.ids)
  await writeLog({
    type: "SMTP_UPDATED",
    message: `Discarded ${discarded} queued email${discarded === 1 ? "" : "s"}`,
    userId: session.user.id,
  })
  return NextResponse.json({ discarded })
}
