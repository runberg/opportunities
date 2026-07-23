import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { recomputeApprovalStatus } from "../../../_helpers"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session
  if (!hasSectionAccess(session, "adhoc", "FULL"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const deliverable = await db.adhocDeliverable.findUnique({ where: { id } })
  if (!deliverable) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (deliverable.status === "DELIVERED" && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can edit a delivered work package" }, { status: 403 })

  const body = await req.json()
  const { description, amount } = body

  if (!description || typeof description !== "string" || description.trim() === "")
    return NextResponse.json({ error: "Description is required" }, { status: 400 })
  if (amount == null || Number.isNaN(Number(amount)) || Number(amount) < 0)
    return NextResponse.json({ error: "Amount must be zero or positive" }, { status: 400 })

  const lineItem = await db.adhocLineItem.create({
    data: {
      description: description.trim(),
      amount: Number(amount),
      deliverableId: id,
    },
  })

  await writeLog({
    type: "ADHOC_LINE_ITEM_ADDED",
    message: `Line item "${lineItem.description}" (${amount}) added to "${deliverable.title}"`,
    userId: session.user.id,
    adhocDeliverableId: id,
  })

  await recomputeApprovalStatus(id, session.user.id)

  return NextResponse.json(lineItem, { status: 201 })
}
