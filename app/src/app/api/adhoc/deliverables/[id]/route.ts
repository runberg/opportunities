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

function validateBody(body: Record<string, unknown>): string | null {
  const { title, status } = body
  if (title !== undefined && (typeof title !== "string" || title.trim() === ""))
    return "Title cannot be empty"
  if (status !== undefined && !VALID_STATUSES.includes(status as AdhocDeliverableStatus))
    return "Invalid status"
  return null
}

function buildChanges(
  body: Record<string, unknown>,
  prev: { title: string; status: string }
): string[] {
  const changes: string[] = []
  if (body.status && body.status !== prev.status) changes.push(`status → ${String(body.status)}`)
  if (body.title && (body.title as string).trim() !== prev.title)
    changes.push(`title → "${(body.title as string).trim()}"`)
  return changes
}

async function handleApprove(
  deliverableId: string,
  rawAmount: unknown,
  userId: string,
  currentLineItems: { amount: unknown }[],
  deliverableTitle: string
): Promise<NextResponse> {
  const amt = Number(rawAmount)
  if (rawAmount == null || Number.isNaN(amt) || amt < 0)
    return NextResponse.json({ error: "Approved amount is required and must be zero or positive" }, { status: 400 })

  const lineTotal = currentLineItems.reduce((s, li) => s + Number(li.amount), 0)
  const newStatus: AdhocDeliverableStatus = lineTotal > amt ? "PARTIALLY_APPROVED" : "APPROVED"

  await db.adhocDeliverable.update({
    where: { id: deliverableId },
    data: { approvedAmount: amt, status: newStatus },
  })

  const partial = newStatus === "PARTIALLY_APPROVED"
    ? ` (partial — line items ${lineTotal.toFixed(2)} exceed approved ${amt.toFixed(2)})`
    : ""
  await writeLog({
    type: "ADHOC_DELIVERABLE_UPDATED",
    message: `"${deliverableTitle}" approved at ${amt.toFixed(2)}${partial}`,
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

  if (deliverable.status === "DELIVERED" && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can edit a delivered work package" }, { status: 403 })

  const body = await req.json() as Record<string, unknown>

  if (body.approve === true)
    return handleApprove(id, body.approvedAmount, session.user.id, deliverable.lineItems, deliverable.title)

  if (body.removeApproval === true) {
    await db.adhocDeliverable.update({ where: { id }, data: { approvedAmount: 0, status: "NOT_APPROVED" } })
    await writeLog({
      type: "ADHOC_DELIVERABLE_UPDATED",
      message: `"${deliverable.title}" approval removed`,
      userId: session.user.id,
      adhocDeliverableId: id,
    })
    return NextResponse.json({ status: "NOT_APPROVED", approvedAmount: 0 })
  }

  const validationError = validateBody(body)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const { title, description, status } = body
  const updated = await db.adhocDeliverable.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: (title as string).trim() }),
      ...(description !== undefined && { description: (description as string | null)?.trim() || null }),
      ...(status !== undefined && { status: status as AdhocDeliverableStatus }),
    },
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
