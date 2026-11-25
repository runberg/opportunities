import { requireAdmin } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { NextRequest, NextResponse } from "next/server"
import {
  changeDelivery, deliveryErrorResponse, DeliveryError, deliveryPlanInput, getDeliveredQuantity,
  getWritableDelivery, removeDeliveryNote, requireDeliveryAccess,
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
  const { session, error } = await requireAdmin()
  if (error) return error
  const { id, deliveryId } = await params
  try {
    const attachments = await changeDelivery(async (tx) => {
      await getWritableDelivery(tx, id, deliveryId)
      const shipments = await tx.deliveryShipment.findMany({ where: { deliveryId }, select: { filename: true } })
      await tx.expectedDelivery.delete({ where: { id: deliveryId } })
      return shipments
    })
    for (const { filename } of attachments) {
      if (filename) await removeDeliveryNote(filename, id)
    }
    await writeLog({ type: "OPPORTUNITY_UPDATED", message: "Deleted a planned delivery.", opportunityId: id, userId: session.user.id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return deliveryErrorResponse(error)
  }
}
