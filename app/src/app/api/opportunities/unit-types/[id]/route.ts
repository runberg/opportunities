import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/shared/lib/api"
import { db } from "@/shared/lib/db"
import { writeLog } from "@/shared/lib/system-log"
import { deliveryErrorResponse } from "@/modules/opportunities/deliveries/server"
import { unitTypeName, unitTypeOption } from "@/modules/opportunities/deliveries/unit-types"

const requestSchema = z.object({ name: unitTypeName }).strict()
type Context = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  const { session, error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Enter a product name of up to 120 characters." }, { status: 400 })
  const { name } = parsed.data

  try {
    const product = await db.deliveryUnitType.update({
      where: { id }, data: { name, nameKey: name.toLowerCase() }, select: unitTypeOption,
    })
    await writeLog({ type: "OPPORTUNITY_UPDATED", userId: session.user.id, message: `Updated delivery product "${product.name}".` })
    return NextResponse.json(product)
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "A product with that name already exists." }, { status: 409 })
    }
    return deliveryErrorResponse(error)
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const { session, error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  try {
    const product = await db.deliveryUnitType.delete({ where: { id }, select: unitTypeOption })
    await writeLog({ type: "OPPORTUNITY_UPDATED", userId: session.user.id, message: `Deleted delivery product "${product.name}".` })
    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json({ error: "This product is used by deliveries and cannot be deleted." }, { status: 409 })
    }
    return deliveryErrorResponse(error)
  }
}
