import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"
import { STATUS_LABELS, toDateString } from "@/lib/utils"
import { requireSession, requireAdmin } from "@/lib/api"
import { writeLog } from "@/lib/system-log"
import { scheduleStatusNotification } from "@/lib/notify"

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
  elCountersignedDate: z.string().optional().nullable(),
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
    rfqDate, quoteSentDate, elRequestedDate, elDraftSharedDate, elSignedSharedDate, elCountersignedDate,
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
  const elCountersignedNew = elCountersignedDate && elCountersignedDate !== toDateString((existing as Record<string, unknown>).elCountersignedDate as Date | null)
  const satPassedNew = satPassedDate && satPassedDate !== toDateString(existing.satPassedDate)
  const deliveredNew = deliveredDate && deliveredDate !== toDateString(existing.deliveredDate)

  // Field edit events
  const titleChanged = rest.title !== undefined && rest.title !== existing.title
  const customerChanged = rest.customer !== undefined && rest.customer !== existing.customer
  const productChanged = rest.product !== undefined && (rest.product ?? null) !== (existing.product ?? null)
  const internalIdChanged = rest.internalId !== undefined && (rest.internalId ?? null) !== (existing.internalId ?? null)
  const referenceChanged = rest.reference !== undefined && (rest.reference ?? null) !== (existing.reference ?? null)
  const descriptionChanged = rest.description !== undefined && (rest.description ?? null) !== (existing.description ?? null)
  const waitingOnChanged = rest.waitingOn !== undefined && rest.waitingOn !== existing.waitingOn
  const satApplicableChanged = rest.satApplicable !== undefined && rest.satApplicable !== existing.satApplicable
  const rfqDateChanged = rfqDate !== undefined && rfqDate !== toDateString(existing.rfqDate)
  const elDraftDateChanged = elDraftSharedDate !== undefined && elDraftSharedDate !== toDateString(existing.elDraftSharedDate)
  const elSignedDateChanged = elSignedSharedDate !== undefined && elSignedSharedDate !== toDateString(existing.elSignedSharedDate)
  const fatDateChanged = fatDate !== undefined && fatDate !== toDateString(existing.fatDate)
  const satDateChanged = satDate !== undefined && satDate !== toDateString(existing.satDate)

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
      elCountersignedDate: dateOrNull(elCountersignedDate),
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
  const WAITING_LABELS: Record<string, string> = {
    INTERNAL: "Internal", CUSTOMER: "Customer", THIRD_PARTY: "Third party", NONE: "None",
  }
  const events: string[] = []
  if (statusChanged) events.push(`Status changed from "${STATUS_LABELS[prevStatus] ?? prevStatus}" to "${STATUS_LABELS[nextStatus] ?? nextStatus}"`)
  if (quoteSentNew) events.push(`Quote marked as sent (${quoteSentDate})`)
  if (elRequestedNew) events.push(`Quote accepted — EL requested (${elRequestedDate})`)
  if (elCountersignedNew) events.push(`EL countersigned (${elCountersignedDate})`)
  if (advancePaymentNew) events.push(`Advance payment confirmed (${advancePaymentDate})`)
  if (fatPassedNew) events.push(`FAT passed (${fatPassedDate})`)
  if (satPassedNew) events.push(`SAT passed (${satPassedDate})`)
  if (deliveredNew) events.push(`Marked as delivered (${deliveredDate})`)
  if (titleChanged) events.push(`Title changed to "${rest.title}"`)
  if (customerChanged) events.push(`Customer changed to "${rest.customer}"`)
  if (productChanged) events.push(rest.product ? `Product set to "${rest.product}"` : `Product cleared`)
  if (internalIdChanged) events.push(rest.internalId ? `Internal ID set to "${rest.internalId}"` : `Internal ID cleared`)
  if (referenceChanged) events.push(rest.reference ? `Reference set to "${rest.reference}"` : `Reference cleared`)
  if (descriptionChanged) events.push(rest.description ? `Details updated` : `Details cleared`)
  if (waitingOnChanged) events.push(`Waiting on set to "${WAITING_LABELS[rest.waitingOn!] ?? rest.waitingOn}"`)
  if (satApplicableChanged) events.push(rest.satApplicable ? `SAT marked as applicable` : `SAT marked as not applicable`)
  if (rfqDateChanged) events.push(rfqDate ? `RFQ date set to ${rfqDate}` : `RFQ date cleared`)
  if (elDraftDateChanged) events.push(elDraftSharedDate ? `EL draft shared date set to ${elDraftSharedDate}` : `EL draft shared date cleared`)
  if (elSignedDateChanged) events.push(elSignedSharedDate ? `EL signed shared date set to ${elSignedSharedDate}` : `EL signed shared date cleared`)
  if (fatDateChanged) events.push(fatDate ? `FAT scheduled for ${fatDate}` : `FAT scheduled date cleared`)
  if (satDateChanged) events.push(satDate ? `SAT scheduled for ${satDate}` : `SAT scheduled date cleared`)

  for (const content of events) {
    await db.comment.create({ data: { content, system: true, opportunityId: id, authorId: session.user.id } })
  }

  if (events.length > 0) {
    await writeLog({
      type: "OPPORTUNITY_UPDATED",
      message: `"${existing.title}": ${events.join("; ")}`,
      userId: session.user.id,
      opportunityId: id,
    })
  }

  if (statusChanged) {
    const actor = await db.user.findUnique({ where: { id: session.user.id }, select: { email: true } })
    scheduleStatusNotification({
      opportunityId: id,
      title: existing.title,
      internalId: existing.internalId,
      customer: existing.customer,
      newStatus: nextStatus,
      actorEmail: actor?.email ?? session.user.id,
    })
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
