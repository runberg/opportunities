import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"

async function generateInternalId(date: Date): Promise<string> {
  const yr = date.getFullYear().toString()
  const mo = (date.getMonth() + 1).toString().padStart(2, "0")
  const prefix = `BT-AH-${yr}${mo}`

  const latest = await db.adhocDeliverable.findFirst({
    where: { internalId: { startsWith: prefix } },
    orderBy: { internalId: "desc" },
    select: { internalId: true },
  })

  const seq = latest?.internalId ? Number.parseInt(latest.internalId.slice(-4), 10) + 1 : 1
  return `${prefix}${seq.toString().padStart(4, "0")}`
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error

  const { id } = await params
  const agreement = await db.adhocAgreement.findUnique({ where: { id } })
  if (!agreement) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const deliverables = await db.adhocDeliverable.findMany({
    where: { agreementId: id },
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      lineItems: { select: { id: true, description: true, amount: true } },
      documents: {
        select: { id: true, displayName: true, type: true, notes: true, uploadedAt: true },
        orderBy: { uploadedAt: "asc" },
      },
    },
  })

  return NextResponse.json(deliverables)
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session

  const { id } = await params
  const agreement = await db.adhocAgreement.findUnique({ where: { id } })
  if (!agreement) return NextResponse.json({ error: "Not found" }, { status: 404 })
  if (agreement.status !== "SIGNED" && agreement.status !== "ACTIVE")
    return NextResponse.json({ error: "Deliverables can only be added to a signed or active agreement" }, { status: 422 })

  const body = await req.json()
  const { title, description, approvedAmount, createdAt } = body

  if (!title || typeof title !== "string" || title.trim() === "")
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  if (approvedAmount !== undefined && (Number.isNaN(Number(approvedAmount)) || Number(approvedAmount) < 0))
    return NextResponse.json({ error: "Approved amount must be zero or positive" }, { status: 400 })
  if (createdAt !== undefined && (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))))
    return NextResponse.json({ error: "createdAt must be a valid date" }, { status: 400 })

  const createdAtDate = createdAt ? new Date(createdAt) : new Date()
  const internalId = await generateInternalId(createdAtDate)

  const deliverable = await db.adhocDeliverable.create({
    data: {
      internalId,
      title: title.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      approvedAmount: Number(approvedAmount ?? 0),
      createdAt: createdAtDate,
      agreementId: id,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      lineItems: true,
      documents: true,
    },
  })

  await writeLog({
    type: "ADHOC_DELIVERABLE_CREATED",
    message: `Deliverable "${deliverable.title}" created`,
    userId: session.user.id,
    adhocDeliverableId: deliverable.id,
  })

  return NextResponse.json(deliverable, { status: 201 })
}
