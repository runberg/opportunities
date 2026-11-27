export interface DeliveryShipment {
  id: string
  quantity: number
  deliveredOn: string
  comment: string | null
  originalName: string | null
  mimeType: string | null
}

export const DELIVERY_TYPES = ["FAT", "SAT", "HANDOVER"] as const
export type DeliveryType = (typeof DELIVERY_TYPES)[number]
export const MAX_DELIVERY_OFFSET = 1200
export const DELIVERY_TYPE_LABELS: Record<DeliveryType, string> = { FAT: "FAT", SAT: "SAT", HANDOVER: "Handover" }

export type UnitTypeOption = { id: string; name: string }

export interface DeliveryLine {
  id: string
  unitType: string
  unitTypeId: string
  quantity: number
  deliveryMonth: number | null
  deliveryYear: number | null
  deliveryType: DeliveryType
  offsetMonths: number | null
  overrideDate: string | null
  shipments: DeliveryShipment[]
}

export function deliveredQuantity(shipments: readonly { quantity: number }[]) {
  return shipments.reduce((total, shipment) => total + shipment.quantity, 0)
}
