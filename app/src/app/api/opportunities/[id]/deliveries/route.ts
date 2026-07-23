import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"

const createSchema = z.object({
  unitType:      z.string().min(1),
  quantity:      z.number().int().positive(),
  deliveryMonth: z.number().int().min(1).max(12),
  deliveryYear:  z.number().int().min(2020),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error
  if (!hasSectionAccess(session, "opportunities", "FULL"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const opportunity = await db.opportunity.findUnique({ where: { id }, select: { id: true } })
  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const delivery = await db.expectedDelivery.create({
    data: { ...parsed.data, opportunityId: id },
  })

  return NextResponse.json(delivery, { status: 201 })
}
