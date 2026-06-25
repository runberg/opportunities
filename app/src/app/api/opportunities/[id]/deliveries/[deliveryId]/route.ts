import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"

const updateSchema = z.object({
  unitType:      z.string().min(1).optional(),
  quantity:      z.number().int().positive().optional(),
  deliveryMonth: z.number().int().min(1).max(12).optional(),
  deliveryYear:  z.number().int().min(2020).optional(),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; deliveryId: string }> }
) {
  const { error } = await requireSession()
  if (error) return error

  const { id, deliveryId } = await params
  const existing = await db.expectedDelivery.findUnique({ where: { id: deliveryId } })
  if (!existing || existing.opportunityId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  const body = await req.json().catch(() => null)
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 })
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const updated = await db.expectedDelivery.update({ where: { id: deliveryId }, data: parsed.data })
  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; deliveryId: string }> }
) {
  const { error } = await requireSession()
  if (error) return error

  const { id, deliveryId } = await params
  const existing = await db.expectedDelivery.findUnique({ where: { id: deliveryId } })
  if (!existing || existing.opportunityId !== id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  await db.expectedDelivery.delete({ where: { id: deliveryId } })
  return NextResponse.json({ ok: true })
}
