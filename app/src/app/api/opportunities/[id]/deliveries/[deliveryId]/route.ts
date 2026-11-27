import { resolveDeliveryUnitType } from "@/modules/opportunities/deliveries/unit-types"
import { requireAdmin } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { NextRequest, NextResponse } from "next/server"
import {
  changeDelivery, deliveryErrorResponse, DeliveryError, deliveryPlanUpdate, getDeliveredQuantity,
  getWritableDelivery, removeDeliveryNote, requireDeliveryAccess,
} from "@/modules/opportunities/deliveries/server"

type Context = { params: Promise<{ id: string; deliveryId: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  const { error } = await requireDeliveryAccess("FULL")
  if (error) return error
  const { id, deliveryId } = await params
  const parsed = deliveryPlanUpdate.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid delivery plan." }, { status: 400 })

  try {
    const updated = await changeDelivery(async (tx) => {
      const delivery = await getWritableDelivery(tx, id, deliveryId)
      const delivered = await getDeliveredQuantity(tx, deliveryId)
      if (parsed.data.quantity !== undefined && parsed.data.quantity < delivered) {
        throw new DeliveryError(`Planned quantity must be at least the ${delivered} already delivered.`)
      }
      const { unitType, unitTypeId, ...plan } = parsed.data
      const type = delivered && unitType === delivery.unitType && !unitTypeId
        ? undefined : await resolveDeliveryUnitType(tx, unitTypeId, unitType)
      if (delivered && type && type.id !== delivery.unitTypeId) {
        throw new DeliveryError("The product cannot change after a delivery is recorded.")
      }
      if (delivery.offsetMonths === null && (parsed.data.deliveryMonth === undefined) !== (parsed.data.deliveryYear === undefined)) {
        throw new DeliveryError("Provide both the delivery month and year.", 400)
      }
      return tx.expectedDelivery.update({ where: { id: deliveryId }, data: {
        ...plan,
        ...(type && type.id !== delivery.unitTypeId && { unitTypeId: type.id, unitType: type.name }),
        ...(parsed.data.offsetMonths !== undefined && { deliveryMonth: null, deliveryYear: null }),
      } })
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
