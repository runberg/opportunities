import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import {
  changeDelivery, deliveryErrorResponse, DeliveryError, getDeliveredQuantity, getWritableDelivery,
  removeDeliveryNote, requireDeliveryAccess, shipmentInput, shipmentSummary,
} from "@/modules/opportunities/deliveries/server"

type Context = { params: Promise<{ id: string; deliveryId: string; shipmentId: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  const { error } = await requireDeliveryAccess("FULL")
  if (error) return error
  const { id, deliveryId, shipmentId } = await params
  const form = await req.formData().catch(() => null)
  const parsed = shipmentInput.safeParse({
    quantity: form?.get("quantity"), deliveredOn: form?.get("deliveredOn"), comment: form?.get("comment") ?? null,
  })
  if (!parsed.success) return NextResponse.json({ error: "Invalid shipment details." }, { status: 400 })

  try {
    const updated = await changeDelivery(async (tx) => {
      const delivery = await getWritableDelivery(tx, id, deliveryId)
      const shipment = await tx.deliveryShipment.findUniqueOrThrow({ where: { id: shipmentId, deliveryId } })
      const available = delivery.quantity - await getDeliveredQuantity(tx, deliveryId) + shipment.quantity
      if (parsed.data.quantity > available) throw new DeliveryError(`This shipment can contain at most ${available} units.`)
      return tx.deliveryShipment.update({
        where: { id: shipmentId, deliveryId }, data: parsed.data, select: shipmentSummary,
      })
    })
    return NextResponse.json(updated)
  } catch (error) {
    return deliveryErrorResponse(error)
  }
}

export async function DELETE(_req: NextRequest, { params }: Context) {
  const { session, error } = await requireAdmin()
  if (error) return error
  const { id, deliveryId, shipmentId } = await params
  try {
    const { filename } = await changeDelivery(async (tx) => {
      await getWritableDelivery(tx, id, deliveryId)
      return tx.deliveryShipment.delete({ where: { id: shipmentId, deliveryId }, select: { filename: true } })
    })
    if (filename) await removeDeliveryNote(filename, id)
    await writeLog({ type: "OPPORTUNITY_UPDATED", message: "Deleted a recorded delivery.", opportunityId: id, userId: session.user.id })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return deliveryErrorResponse(error)
  }
}
