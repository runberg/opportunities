import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { recomputeApprovalStatus } from "../../_helpers"


export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session
  if (!hasSectionAccess(session, "adhoc", "FULL"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const lineItem = await db.adhocLineItem.findUnique({
    where: { id },
    include: { deliverable: true },
  })
  if (!lineItem) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (lineItem.deliverable.status === "DELIVERED" && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can edit a delivered work package" }, { status: 403 })

  const body = await req.json()
  const { description, amount } = body

  if (description !== undefined && (typeof description !== "string" || description.trim() === ""))
    return NextResponse.json({ error: "Description cannot be empty" }, { status: 400 })
  if (amount !== undefined && (Number.isNaN(Number(amount)) || Number(amount) < 0))
    return NextResponse.json({ error: "Amount must be zero or positive" }, { status: 400 })

  const updated = await db.adhocLineItem.update({
    where: { id },
    data: {
      ...(description !== undefined && { description: description.trim() }),
      ...(amount !== undefined && { amount: Number(amount) }),
    },
  })

  await writeLog({
    type: "ADHOC_LINE_ITEM_UPDATED",
    message: `Line item "${updated.description}" updated in "${lineItem.deliverable.title}"`,
    userId: session.user.id,
    adhocDeliverableId: lineItem.deliverableId,
  })

  await recomputeApprovalStatus(lineItem.deliverableId, session.user.id)

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session
  if (!hasSectionAccess(session, "adhoc", "FULL"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const lineItem = await db.adhocLineItem.findUnique({
    where: { id },
    include: { deliverable: true },
  })
  if (!lineItem) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (lineItem.deliverable.status === "DELIVERED" && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can edit a delivered work package" }, { status: 403 })

  await db.adhocLineItem.delete({ where: { id } })

  await writeLog({
    type: "ADHOC_LINE_ITEM_DELETED",
    message: `Line item "${lineItem.description}" deleted from "${lineItem.deliverable.title}"`,
    userId: session.user.id,
    adhocDeliverableId: lineItem.deliverableId,
  })

  await recomputeApprovalStatus(lineItem.deliverableId, session.user.id)

  return NextResponse.json({ ok: true })
}
