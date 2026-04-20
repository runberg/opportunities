import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"
import { STATUS_LABELS, toDateString } from "@/lib/utils"
import { requireSession, requireAdmin } from "@/lib/api"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSession()
  if (error) return error

  const { id } = await params
  const opportunity = await db.opportunity.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      documents: {
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { uploadedAt: "desc" },
      },
    },
  })

  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(opportunity)
}

const updateSchema = z.object({
  internalId: z.string().optional().nullable(),
  title: z.string().min(1).optional(),
  customer: z.string().min(1).optional(),
  reference: z.string().optional().nullable(),
  rfqDate: z.string().optional().nullable(),
  product: z.string().optional().nullable(),
  status: z.string().optional(),
  waitingOn: z.string().optional(),
  quoteSentDate: z.string().optional().nullable(),
  elRequestedDate: z.string().optional().nullable(),
  elDraftSharedDate: z.string().optional().nullable(),
  elSignedSharedDate: z.string().optional().nullable(),
  // Production fields
  advancePaymentDate: z.string().optional().nullable(),
  fatDate: z.string().optional().nullable(),
  fatPassedDate: z.string().optional().nullable(),
  satApplicable: z.boolean().optional(),
  satDate: z.string().optional().nullable(),
  satPassedDate: z.string().optional().nullable(),
  deliveredDate: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const existing = await db.opportunity.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const {
    rfqDate, quoteSentDate, elRequestedDate, elDraftSharedDate, elSignedSharedDate,
    advancePaymentDate, fatDate, fatPassedDate, satDate, satPassedDate, deliveredDate,
    ...rest
  } = parsed.data

  // Auto-advance status based on newly set dates
  let autoStatus = rest.status
  if (advancePaymentDate && advancePaymentDate !== toDateString(existing.advancePaymentDate)
      && existing.status === "PENDING_ADVANCE_PAYMENT") {
    autoStatus = "IN_PRODUCTION"
  }
  if (deliveredDate && deliveredDate !== toDateString(existing.deliveredDate)) {
    autoStatus = "DELIVERED"
  }

  // Capture system events before updating
  const prevStatus = existing.status
  const nextStatus = autoStatus ?? existing.status
  const statusChanged = nextStatus !== prevStatus
  const quoteSentNew = quoteSentDate && quoteSentDate !== toDateString(existing.quoteSentDate)
  const elRequestedNew = elRequestedDate && elRequestedDate !== toDateString(existing.elRequestedDate)
  const advancePaymentNew = advancePaymentDate && advancePaymentDate !== toDateString(existing.advancePaymentDate)
  const fatPassedNew = fatPassedDate && fatPassedDate !== toDateString(existing.fatPassedDate)
  const satPassedNew = satPassedDate && satPassedDate !== toDateString(existing.satPassedDate)
  const deliveredNew = deliveredDate && deliveredDate !== toDateString(existing.deliveredDate)

  function dateOrNull(s: string | null | undefined) {
    return s !== undefined ? (s ? new Date(s) : null) : undefined
  }

  const updated = await db.opportunity.update({
    where: { id },
    data: {
      ...rest,
      rfqDate: dateOrNull(rfqDate),
      quoteSentDate: dateOrNull(quoteSentDate),
      elRequestedDate: dateOrNull(elRequestedDate),
      elDraftSharedDate: dateOrNull(elDraftSharedDate),
      elSignedSharedDate: dateOrNull(elSignedSharedDate),
      advancePaymentDate: dateOrNull(advancePaymentDate),
      fatDate: dateOrNull(fatDate),
      fatPassedDate: dateOrNull(fatPassedDate),
      satDate: dateOrNull(satDate),
      satPassedDate: dateOrNull(satPassedDate),
      deliveredDate: dateOrNull(deliveredDate),
      status: autoStatus as never ?? rest.status as never,
      waitingOn: rest.waitingOn as never,
    },
  })

  // System log events
  const events: string[] = []
  if (statusChanged) events.push(`Status changed from "${STATUS_LABELS[prevStatus] ?? prevStatus}" to "${STATUS_LABELS[nextStatus] ?? nextStatus}"`)
  if (quoteSentNew) events.push(`Quote marked as sent (${quoteSentDate})`)
  if (elRequestedNew) events.push(`Quote accepted — EL requested (${elRequestedDate})`)
  if (advancePaymentNew) events.push(`Advance payment confirmed (${advancePaymentDate})`)
  if (fatPassedNew) events.push(`FAT passed (${fatPassedDate})`)
  if (satPassedNew) events.push(`SAT passed (${satPassedDate})`)
  if (deliveredNew) events.push(`Marked as delivered (${deliveredDate})`)

  for (const content of events) {
    await db.comment.create({ data: { content, system: true, opportunityId: id } })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  await db.opportunity.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
