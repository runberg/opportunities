import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { AdhocDeliverableStatus } from "@prisma/client"

const VALID_STATUSES = Object.values(AdhocDeliverableStatus)

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error

  const { id } = await params
  const deliverable = await db.adhocDeliverable.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      agreement: { select: { id: true, title: true, version: true, status: true } },
      lineItems: { orderBy: { createdAt: "asc" } },
      documents: {
        orderBy: { uploadedAt: "asc" },
        include: { uploadedBy: { select: { id: true, name: true } } },
      },
      systemLogs: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  })

  if (!deliverable) return NextResponse.json({ error: "Not found" }, { status: 404 })
  return NextResponse.json(deliverable)
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session

  const { id } = await params
  const deliverable = await db.adhocDeliverable.findUnique({ where: { id } })
  if (!deliverable) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // DELIVERED is locked for non-admins
  if (deliverable.status === "DELIVERED" && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can edit a delivered work package" }, { status: 403 })

  const body = await req.json()
  const { title, description, approvedAmount, status } = body

  if (title !== undefined && (typeof title !== "string" || title.trim() === ""))
    return NextResponse.json({ error: "Title cannot be empty" }, { status: 400 })
  if (status !== undefined && !VALID_STATUSES.includes(status))
    return NextResponse.json({ error: "Invalid status" }, { status: 400 })
  if (approvedAmount !== undefined && (isNaN(Number(approvedAmount)) || Number(approvedAmount) < 0))
    return NextResponse.json({ error: "Approved amount must be zero or positive" }, { status: 400 })

  const updated = await db.adhocDeliverable.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: title.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(approvedAmount !== undefined && { approvedAmount: Number(approvedAmount) }),
      ...(status !== undefined && { status: status as AdhocDeliverableStatus }),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      lineItems: { orderBy: { createdAt: "asc" } },
      documents: {
        orderBy: { uploadedAt: "asc" },
        include: { uploadedBy: { select: { id: true, name: true } } },
      },
      systemLogs: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, name: true } } },
      },
    },
  })

  const changes: string[] = []
  if (status && status !== deliverable.status) changes.push(`status → ${status}`)
  if (title && title.trim() !== deliverable.title) changes.push(`title → "${title.trim()}"`)
  if (approvedAmount !== undefined && Number(approvedAmount) !== Number(deliverable.approvedAmount))
    changes.push(`approved amount → ${approvedAmount}`)

  await writeLog({
    type: "ADHOC_DELIVERABLE_UPDATED",
    message: `"${updated.title}" updated${changes.length ? `: ${changes.join(", ")}` : ""}`,
    userId: session.user.id,
    adhocDeliverableId: id,
  })

  return NextResponse.json(updated)
}
