import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { AdhocDeliverableStatus } from "@prisma/client"

const VALID_STATUSES = Object.values(AdhocDeliverableStatus)

const FULL_INCLUDE = {
  createdBy: { select: { id: true, name: true } },
  agreement: { select: { id: true, title: true, version: true, status: true } },
  lineItems: { orderBy: { createdAt: "asc" as const } },
  documents: {
    orderBy: { uploadedAt: "asc" as const },
    include: { uploadedBy: { select: { id: true, name: true } } },
  },
  systemLogs: {
    orderBy: { createdAt: "desc" as const },
    include: { user: { select: { id: true, name: true } } },
  },
  comments: {
    orderBy: { createdAt: "desc" as const },
    include: { author: { select: { id: true, name: true } } },
  },
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error

  const { id } = await params
  const deliverable = await db.adhocDeliverable.findUnique({ where: { id }, include: FULL_INCLUDE })

  if (!deliverable) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(deliverable)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function generateInternalId(): Promise<string> {
  const now = new Date()
  const yr = now.getFullYear().toString()
  const mo = (now.getMonth() + 1).toString().padStart(2, "0")
  const prefix = `BT-AH-${yr}${mo}`

  const latest = await db.adhocDeliverable.findFirst({
    where: { internalId: { startsWith: prefix } },
    orderBy: { internalId: "desc" },
    select: { internalId: true },
  })

  const seq = latest?.internalId ? Number.parseInt(latest.internalId.slice(-4), 10) + 1 : 1
  return `${prefix}${seq.toString().padStart(4, "0")}`
}

function validateBody(body: Record<string, unknown>): string | null {
  const { title, status, createdAt, partiallyApprovedAt, approvedAt, deliveredAt } = body
  if (title !== undefined && (typeof title !== "string" || title.trim() === ""))
    return "Title cannot be empty"
  if (status !== undefined && !VALID_STATUSES.includes(status as AdhocDeliverableStatus))
    return "Invalid status"
  if (createdAt !== undefined) {
    if (createdAt === null || typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt)))
      return "createdAt must be a valid date"
  }
  for (const [field, value] of [["partiallyApprovedAt", partiallyApprovedAt], ["approvedAt", approvedAt], ["deliveredAt", deliveredAt]] as const) {
    if (value !== undefined && value !== null) {
      if (typeof value !== "string" || Number.isNaN(Date.parse(value as string)))
        return `${field} must be a valid date or null`
    }
  }
  return null
}

function buildChanges(
  body: Record<string, unknown>,
  prev: { title: string; status: string }
): string[] {
  const changes: string[] = []
  if (body.status && body.status !== prev.status) changes.push(`status → ${body.status as string}`)
  if (body.title && (body.title as string).trim() !== prev.title)
    changes.push(`title → "${(body.title as string).trim()}"`)
  return changes
}

function parseDateField(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined
  if (value === null) return null
  return new Date(value as string)
}

function autoStatusDates(
  newStatus: AdhocDeliverableStatus,
  prev: { status: string },
  body: Record<string, unknown>
): Record<string, Date | null> {
  const dates: Record<string, Date | null> = {}
  if (newStatus === prev.status) return dates
  const now = new Date()
  if (newStatus === "PARTIALLY_APPROVED" && !("partiallyApprovedAt" in body)) dates.partiallyApprovedAt = now
  if (newStatus === "APPROVED" && !("approvedAt" in body)) dates.approvedAt = now
  if (newStatus === "DELIVERED" && !("deliveredAt" in body)) dates.deliveredAt = now
  return dates
}

async function handleApprove(
  deliverableId: string,
  rawAmount: unknown,
  userId: string,
  currentLineItems: { amount: unknown }[],
  deliverable: { title: string; partiallyApprovedAt: Date | null; approvedAt: Date | null }
): Promise<NextResponse> {
  const amt = Number(rawAmount)
  if (rawAmount == null || Number.isNaN(amt) || amt < 0)
    return NextResponse.json({ error: "Approved amount is required and must be zero or positive" }, { status: 400 })

  const lineTotal = currentLineItems.reduce((s, li) => s + Number(li.amount), 0)
  const newStatus: AdhocDeliverableStatus = lineTotal > amt ? "PARTIALLY_APPROVED" : "APPROVED"

  const now = new Date()
  await db.adhocDeliverable.update({
    where: { id: deliverableId },
    data: {
      approvedAmount: amt,
      status: newStatus,
      partiallyApprovedAt: newStatus === "PARTIALLY_APPROVED" && !deliverable.partiallyApprovedAt ? now : undefined,
      approvedAt: newStatus === "APPROVED" && !deliverable.approvedAt ? now : undefined,
    },
  })

  const partial = newStatus === "PARTIALLY_APPROVED"
    ? ` (partial — line items ${lineTotal.toFixed(2)} exceed approved ${amt.toFixed(2)})`
    : ""
  await writeLog({
    type: "ADHOC_DELIVERABLE_UPDATED",
    message: `"${deliverable.title}" approved at ${amt.toFixed(2)}${partial}`,
    userId,
    adhocDeliverableId: deliverableId,
  })

  return NextResponse.json({ status: newStatus, approvedAmount: amt })
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session

  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const { id } = await params
  const deliverable = await db.adhocDeliverable.findUnique({ where: { id } })
  if (!deliverable) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await writeLog({
    type: "ADHOC_DELIVERABLE_UPDATED",
    message: `Work package "${deliverable.title}" deleted by admin`,
    userId: session.user.id,
    adhocDeliverableId: id,
  })

  await db.adhocDeliverable.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}

async function handleRemoveApproval(deliverableId: string, title: string, userId: string): Promise<NextResponse> {
  await db.adhocDeliverable.update({
    where: { id: deliverableId },
    data: { approvedAmount: 0, status: "NOT_APPROVED", approvedAt: null, partiallyApprovedAt: null },
  })
  await writeLog({
    type: "ADHOC_DELIVERABLE_UPDATED",
    message: `"${title}" approval removed`,
    userId,
    adhocDeliverableId: deliverableId,
  })
  return NextResponse.json({ status: "NOT_APPROVED", approvedAmount: 0 })
}

function buildUpdateData(body: Record<string, unknown>, deliverable: { status: string }) {
  const { title, description, status } = body
  const newStatus = status as AdhocDeliverableStatus | undefined
  return {
    ...(title !== undefined && { title: (title as string).trim() }),
    ...(description !== undefined && { description: (description as string | null)?.trim() || null }),
    ...(newStatus !== undefined && { status: newStatus }),
    ...(newStatus !== undefined && autoStatusDates(newStatus, deliverable, body)),
    ...("createdAt" in body && body.createdAt !== null && { createdAt: new Date(body.createdAt as string) }),
    ...("partiallyApprovedAt" in body && { partiallyApprovedAt: parseDateField(body.partiallyApprovedAt) }),
    ...("approvedAt" in body && { approvedAt: parseDateField(body.approvedAt) }),
    ...("deliveredAt" in body && { deliveredAt: parseDateField(body.deliveredAt) }),
  }
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session

  const { id } = await params
  const deliverable = await db.adhocDeliverable.findUnique({
    where: { id },
    include: { lineItems: true },
  })
  if (!deliverable) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json() as Record<string, unknown>

  const isRevertingDelivered = deliverable.status === "DELIVERED" && body.status === "APPROVED"
  if (deliverable.status === "DELIVERED" && session.user.role !== "ADMIN" && !isRevertingDelivered)
    return NextResponse.json({ error: "Only admins can edit a delivered work package" }, { status: 403 })

  if (body.approve === true)
    return handleApprove(id, body.approvedAmount, session.user.id, deliverable.lineItems, deliverable)

  if (body.removeApproval === true)
    return handleRemoveApproval(id, deliverable.title, session.user.id)

  const validationError = validateBody(body)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const updated = await db.adhocDeliverable.update({
    where: { id },
    data: buildUpdateData(body, deliverable),
    include: FULL_INCLUDE,
  })

  const changes = buildChanges(body, deliverable)
  const changeSuffix = changes.length ? `: ${changes.join(", ")}` : ""
  await writeLog({
    type: "ADHOC_DELIVERABLE_UPDATED",
    message: `"${updated.title}" updated${changeSuffix}`,
    userId: session.user.id,
    adhocDeliverableId: id,
  })

  return NextResponse.json(updated)
}
