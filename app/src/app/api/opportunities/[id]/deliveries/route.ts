import { NextRequest, NextResponse } from "next/server"
import {
  changeDelivery, deliveryErrorResponse, DeliveryError, deliveryPlanInput, requireDeliveryAccess,
} from "@/modules/opportunities/deliveries/server"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireDeliveryAccess("FULL")
  if (error) return error
  const { id } = await params
  const parsed = deliveryPlanInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid delivery plan." }, { status: 400 })

  try {
    const delivery = await changeDelivery(async (tx) => {
      const opportunity = await tx.opportunity.findUnique({ where: { id }, select: { isArchived: true } })
      if (!opportunity) throw new DeliveryError("Opportunity not found.", 404)
      if (opportunity.isArchived) throw new DeliveryError("Unarchive the opportunity before editing deliveries.")
      return tx.expectedDelivery.create({ data: { ...parsed.data, opportunityId: id } })
    })
    return NextResponse.json(delivery, { status: 201 })
  } catch (error) {
    return deliveryErrorResponse(error)
  }
}
