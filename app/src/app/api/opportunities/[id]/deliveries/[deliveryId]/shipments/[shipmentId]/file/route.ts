import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { serveDocumentResponse } from "@/shared/lib/serve-doc"
import {
  changeDelivery, deliveryErrorResponse, DeliveryError, getWritableDelivery,
  parseDeliveryNote, requireDeliveryAccess, saveDeliveryNote, shipmentSummary,
} from "@/modules/opportunities/deliveries/server"

type Context = { params: Promise<{ id: string; deliveryId: string; shipmentId: string }> }

export async function GET(req: NextRequest, { params }: Context) {
  const { error } = await requireDeliveryAccess("READ_ONLY")
  if (error) return error
  const { id, deliveryId, shipmentId } = await params
  const note = await db.deliveryShipment.findUnique({
    where: { id: shipmentId, deliveryId, delivery: { opportunityId: id } },
    select: { filename: true, originalName: true, mimeType: true },
  })
  if (!note?.filename || !note.originalName || !note.mimeType) {
    return NextResponse.json({ error: "Delivery note not found." }, { status: 404 })
  }
  return serveDocumentResponse(req, { filename: note.filename, originalName: note.originalName, mimeType: note.mimeType })
}

export async function PATCH(req: NextRequest, { params }: Context) {
  const { error } = await requireDeliveryAccess("FULL")
  if (error) return error
  const { id, deliveryId, shipmentId } = await params
  const form = await req.formData().catch(() => null)
  try {
    const file = parseDeliveryNote(form?.get("file") ?? null)
    if (!file) throw new DeliveryError("Choose a delivery note.", 400)
    const shipment = await saveDeliveryNote(file, id, (attachment) => changeDelivery(async (tx) => {
      await getWritableDelivery(tx, id, deliveryId)
      const existing = await tx.deliveryShipment.findUnique({
        where: { id: shipmentId, deliveryId }, select: { filename: true },
      })
      if (!existing) throw new DeliveryError("Shipment not found.", 404)
      if (existing.filename) throw new DeliveryError("This shipment already has a delivery note.")
      return tx.deliveryShipment.update({
        where: { id: shipmentId }, data: attachment, select: shipmentSummary,
      })
    }))
    return NextResponse.json(shipment)
  } catch (error) {
    return deliveryErrorResponse(error)
  }
}
