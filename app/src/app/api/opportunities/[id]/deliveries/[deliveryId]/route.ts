import { NextRequest, NextResponse } from "next/server"
import {
  changeDelivery, deliveryErrorResponse, DeliveryError, deliveryPlanInput, getDeliveredQuantity,
  getWritableDelivery, requireDeliveryAccess,
} from "@/modules/opportunities/deliveries/server"

type Context = { params: Promise<{ id: string; deliveryId: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  const { error } = await requireDeliveryAccess("FULL")
  if (error) return error
  const { id, deliveryId } = await params
  const parsed = deliveryPlanInput.partial().safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid delivery plan." }, { status: 400 })

  try {
    const updated = await changeDelivery(async (tx) => {
      const delivery = await getWritableDelivery(tx, id, deliveryId)
      const delivered = await getDeliveredQuantity(tx, deliveryId)
      if (parsed.data.quantity !== undefined && parsed.data.quantity < delivered) {
        throw new DeliveryError(`Planned quantity must be at least the ${delivered} already delivered.`)
      }
      if (delivered && parsed.data.unitType !== undefined && parsed.data.unitType !== delivery.unitType) {
        throw new DeliveryError("The unit type cannot change after a shipment is recorded.")
      }
      return tx.expectedDelivery.update({ where: { id: deliveryId }, data: parsed.data })
    })
    return NextResponse.json(updated)
  } catch (error) {
    return deliveryErrorResponse(error)
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const { error } = await requireDeliveryAccess("FULL")
  if (error) return error
  const { id, deliveryId } = await params
  try {
    await changeDelivery(async (tx) => {
      await getWritableDelivery(tx, id, deliveryId)
      if (await getDeliveredQuantity(tx, deliveryId)) {
        throw new DeliveryError("A delivery with recorded shipments cannot be removed.")
      }
      await tx.expectedDelivery.delete({ where: { id: deliveryId } })
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return deliveryErrorResponse(error)
  }
}
