import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireAdmin } from "@/shared/lib/api"
import { deliveryErrorResponse, changeDelivery } from "@/modules/opportunities/deliveries/server"
import { getOrCreateUnitType, unitTypeName } from "@/modules/opportunities/deliveries/unit-types"

const requestSchema = z.object({ name: unitTypeName })

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error
  const parsed = requestSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Enter a product name of up to 120 characters." }, { status: 400 })
  try {
    const type = await changeDelivery((tx) => getOrCreateUnitType(tx, parsed.data.name))
    return NextResponse.json(type, { status: 201 })
  } catch (error) {
    return deliveryErrorResponse(error)
  }
}
