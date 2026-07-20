import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { z } from "zod"
import { type Opportunity, OpportunityStatus, WaitingOn } from "@prisma/client"
import { STATUS_LABELS, toDateString, WAITING_LABELS } from "@/shared/lib/utils"
import { requireSession, requireAdmin } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { scheduleNotification } from "@/shared/lib/notify"

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
      deliveries: {
        orderBy: [{ deliveryYear: "asc" }, { deliveryMonth: "asc" }],
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
  status: z.nativeEnum(OpportunityStatus).optional(),
  waitingOn: z.nativeEnum(WaitingOn).optional(),
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

type ParsedUpdate = z.infer<typeof updateSchema>
type DateFieldKey =
  | "rfqDate" | "quoteSentDate" | "elRequestedDate" | "elDraftSharedDate" | "elSignedSharedDate"
  | "elCountersignedDate" | "advancePaymentDate" | "fatDate" | "fatPassedDate" | "satDate"
  | "satPassedDate" | "deliveredDate"
type DateFields = Pick<ParsedUpdate, DateFieldKey>
type RestFields = Omit<ParsedUpdate, DateFieldKey>

function dateOrNull(s: string | null | undefined): Date | null | undefined {
  if (s === undefined) return undefined
  return s ? new Date(s) : null
}

function changed(next: string | null | undefined, prev: string | null): boolean {
  return (next ?? null) !== prev
}

function inferAutoStatus(
  existing: Pick<Opportunity, "status" | "advancePaymentDate" | "deliveredDate">,
  dates: Pick<DateFields, "advancePaymentDate" | "deliveredDate">,
  requestedStatus: OpportunityStatus | undefined
): OpportunityStatus | undefined {
  let status = requestedStatus
  if (
    dates.advancePaymentDate &&
    dates.advancePaymentDate !== toDateString(existing.advancePaymentDate) &&
    existing.status === "PENDING_ADVANCE_PAYMENT"
  ) {
    status = "IN_PRODUCTION"
  }
  if (dates.deliveredDate && dates.deliveredDate !== toDateString(existing.deliveredDate)) {
    status = "DELIVERED"
  }
  return status
}

function elRequestedMessage(status: OpportunityStatus, date: string): string {
  return status === "QUOTE_SENT"
    ? `Quote accepted — EL requested (${date})`
    : `Quote skipped — EL requested (${date})`
}

function buildMilestoneEvents(existing: Opportunity, dates: DateFields): string[] {
  const events: string[] = []
  if (dates.quoteSentDate && dates.quoteSentDate !== toDateString(existing.quoteSentDate))
    events.push(`Quote marked as sent (${dates.quoteSentDate})`)
  if (dates.elRequestedDate && dates.elRequestedDate !== toDateString(existing.elRequestedDate))
    events.push(elRequestedMessage(existing.status, dates.elRequestedDate))
  if (dates.elCountersignedDate && dates.elCountersignedDate !== toDateString(existing.elCountersignedDate))
    events.push(`EL countersigned (${dates.elCountersignedDate})`)
  if (dates.advancePaymentDate && dates.advancePaymentDate !== toDateString(existing.advancePaymentDate))
    events.push(`Advance payment confirmed (${dates.advancePaymentDate})`)
  if (dates.fatPassedDate && dates.fatPassedDate !== toDateString(existing.fatPassedDate))
    events.push(`FAT passed (${dates.fatPassedDate})`)
  if (dates.satPassedDate && dates.satPassedDate !== toDateString(existing.satPassedDate))
    events.push(`SAT passed (${dates.satPassedDate})`)
  if (dates.deliveredDate && dates.deliveredDate !== toDateString(existing.deliveredDate))
    events.push(`Marked as delivered (${dates.deliveredDate})`)
  return events
}

function buildSimpleFieldEvents(existing: Opportunity, rest: RestFields): string[] {
  const satMsg = rest.satApplicable ? `SAT marked as applicable` : `SAT marked as not applicable`
  const events: string[] = []
  if (rest.title !== undefined && rest.title !== existing.title)
    events.push(`Title changed to "${rest.title}"`)
  if (rest.customer !== undefined && rest.customer !== existing.customer)
    events.push(`Customer changed to "${rest.customer}"`)
  if (rest.waitingOn !== undefined && rest.waitingOn !== existing.waitingOn)
    events.push(`Waiting on set to "${WAITING_LABELS[rest.waitingOn] ?? rest.waitingOn}"`)
  if (rest.satApplicable !== undefined && rest.satApplicable !== existing.satApplicable)
    events.push(satMsg)
  return events
}

function buildNullableFieldEvents(existing: Opportunity, rest: RestFields): string[] {
  const msgs = {
    product: rest.product ? `Product set to "${rest.product}"` : `Product cleared`,
    internalId: rest.internalId ? `Internal ID set to "${rest.internalId}"` : `Internal ID cleared`,
    reference: rest.reference ? `Reference set to "${rest.reference}"` : `Reference cleared`,
    description: rest.description ? `Details updated` : `Details cleared`,
  }
  const events: string[] = []
  if (rest.product !== undefined && changed(rest.product, existing.product)) events.push(msgs.product)
  if (rest.internalId !== undefined && changed(rest.internalId, existing.internalId)) events.push(msgs.internalId)
  if (rest.reference !== undefined && changed(rest.reference, existing.reference)) events.push(msgs.reference)
  if (rest.description !== undefined && changed(rest.description, existing.description)) events.push(msgs.description)
  return events
}

function buildScheduledDateEvents(existing: Opportunity, dates: DateFields): string[] {
  const msgs = {
    rfq: dates.rfqDate ? `RFQ date set to ${dates.rfqDate}` : `RFQ date cleared`,
    elDraft: dates.elDraftSharedDate ? `EL draft shared date set to ${dates.elDraftSharedDate}` : `EL draft shared date cleared`,
    elSigned: dates.elSignedSharedDate ? `EL signed shared date set to ${dates.elSignedSharedDate}` : `EL signed shared date cleared`,
    fat: dates.fatDate ? `FAT scheduled for ${dates.fatDate}` : `FAT scheduled date cleared`,
    sat: dates.satDate ? `SAT scheduled for ${dates.satDate}` : `SAT scheduled date cleared`,
  }
  const events: string[] = []
  if (dates.rfqDate !== undefined && dates.rfqDate !== toDateString(existing.rfqDate)) events.push(msgs.rfq)
  if (dates.elDraftSharedDate !== undefined && dates.elDraftSharedDate !== toDateString(existing.elDraftSharedDate)) events.push(msgs.elDraft)
  if (dates.elSignedSharedDate !== undefined && dates.elSignedSharedDate !== toDateString(existing.elSignedSharedDate)) events.push(msgs.elSigned)
  if (dates.fatDate !== undefined && dates.fatDate !== toDateString(existing.fatDate)) events.push(msgs.fat)
  if (dates.satDate !== undefined && dates.satDate !== toDateString(existing.satDate)) events.push(msgs.sat)
  return events
}

function buildChangeEvents(
  existing: Opportunity,
  dates: DateFields,
  rest: RestFields,
  prevStatus: OpportunityStatus,
  nextStatus: OpportunityStatus
): string[] {
  const events: string[] = []
  if (nextStatus !== prevStatus)
    events.push(`Status changed from "${STATUS_LABELS[prevStatus] ?? prevStatus}" to "${STATUS_LABELS[nextStatus] ?? nextStatus}"`)
  events.push(
    ...buildMilestoneEvents(existing, dates),
    ...buildSimpleFieldEvents(existing, rest),
    ...buildNullableFieldEvents(existing, rest),
    ...buildScheduledDateEvents(existing, dates),
  )
  return events
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id } = await params
  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const existing = await db.opportunity.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const {
    rfqDate, quoteSentDate, elRequestedDate, elDraftSharedDate, elSignedSharedDate, elCountersignedDate,
    advancePaymentDate, fatDate, fatPassedDate, satDate, satPassedDate, deliveredDate,
    ...rest
  } = parsed.data

  const dates: DateFields = {
    rfqDate, quoteSentDate, elRequestedDate, elDraftSharedDate, elSignedSharedDate, elCountersignedDate,
    advancePaymentDate, fatDate, fatPassedDate, satDate, satPassedDate, deliveredDate,
  }

  const prevStatus = existing.status
  const autoStatus = inferAutoStatus(existing, dates, rest.status)
  const nextStatus = autoStatus ?? existing.status

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
      status: autoStatus ?? rest.status,
      waitingOn: rest.waitingOn,
    },
  })

  const events = buildChangeEvents(existing, dates, rest, prevStatus, nextStatus)

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

  if (events.length > 0) {
    const statusChanges = events.filter((e) => e.startsWith("Status changed"))
    scheduleNotification({
      module: "opportunity",
      itemId: id,
      actorId: session.user.id,
      title: existing.title,
      internalId: existing.internalId,
      customer: existing.customer,
      changes: events,
      statusChanges,
    }).catch((err) => console.error("Failed to schedule notification:", err))
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
