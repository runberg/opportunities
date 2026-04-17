import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"
import { STATUS_LABELS } from "@/lib/utils"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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
  description: z.string().optional().nullable(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const existing = await db.opportunity.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const { rfqDate, quoteSentDate, elRequestedDate, elDraftSharedDate, elSignedSharedDate, ...rest } = parsed.data

  // Capture system events before updating
  const statusChanged = rest.status && rest.status !== existing.status
  const quoteSentNew =
    quoteSentDate && quoteSentDate !== existing.quoteSentDate?.toISOString().split("T")[0]
  const elRequestedNew =
    elRequestedDate && elRequestedDate !== existing.elRequestedDate?.toISOString().split("T")[0]

  const updated = await db.opportunity.update({
    where: { id },
    data: {
      ...rest,
      rfqDate: rfqDate !== undefined ? (rfqDate ? new Date(rfqDate) : null) : undefined,
      quoteSentDate:
        quoteSentDate !== undefined ? (quoteSentDate ? new Date(quoteSentDate) : null) : undefined,
      elRequestedDate:
        elRequestedDate !== undefined ? (elRequestedDate ? new Date(elRequestedDate) : null) : undefined,
      elDraftSharedDate:
        elDraftSharedDate !== undefined ? (elDraftSharedDate ? new Date(elDraftSharedDate) : null) : undefined,
      elSignedSharedDate:
        elSignedSharedDate !== undefined ? (elSignedSharedDate ? new Date(elSignedSharedDate) : null) : undefined,
      status: rest.status as never,
      waitingOn: rest.waitingOn as never,
    },
  })

  // System event: status change
  if (statusChanged) {
    await db.comment.create({
      data: {
        content: `Status changed from "${STATUS_LABELS[existing.status] ?? existing.status}" to "${STATUS_LABELS[rest.status!] ?? rest.status}"`,
        system: true,
        opportunityId: id,
      },
    })
  }
  // System event: quote sent
  if (quoteSentNew) {
    await db.comment.create({
      data: {
        content: `Quote marked as sent (${quoteSentDate})`,
        system: true,
        opportunityId: id,
      },
    })
  }
  // System event: EL requested (quote accepted)
  if (elRequestedNew) {
    await db.comment.create({
      data: {
        content: `Quote accepted — EL requested (${elRequestedDate})`,
        system: true,
        opportunityId: id,
      },
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  await db.opportunity.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
