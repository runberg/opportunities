import { NextRequest, NextResponse } from "next/server"
import {
  changeDelivery, deliveryErrorResponse, DeliveryError, getDeliveredQuantity, getWritableDelivery,
  parseDeliveryNote, requireDeliveryAccess, saveDeliveryNote, shipmentInput, shipmentSummary,
} from "@/modules/opportunities/deliveries/server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; deliveryId: string }> }) {
  const { error } = await requireDeliveryAccess("FULL")
  if (error) return error
  const { id, deliveryId } = await params
  const form = await req.formData().catch(() => null)
  if (!form) return NextResponse.json({ error: "Invalid shipment form." }, { status: 400 })
  const parsed = shipmentInput.safeParse({
    quantity: form.get("quantity"), deliveredOn: form.get("deliveredOn"), comment: form.get("comment"),
  })
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a positive whole quantity, a delivery date, and a comment of up to 500 characters." }, { status: 400 })
  }

  try {
    const file = parseDeliveryNote(form.get("file"))
    const shipment = await saveDeliveryNote(file, id, (attachment) => changeDelivery(async (tx) => {
      const delivery = await getWritableDelivery(tx, id, deliveryId)
      const remaining = delivery.quantity - await getDeliveredQuantity(tx, deliveryId)
      if (parsed.data.quantity > remaining) throw new DeliveryError(`Only ${remaining} units remain on this delivery line.`)
      return tx.deliveryShipment.create({
        data: { ...parsed.data, ...attachment, deliveryId },
        select: shipmentSummary,
      })
    }))
    return NextResponse.json(shipment, { status: 201 })
  } catch (error) {
    return deliveryErrorResponse(error)
  }
}
