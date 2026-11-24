export interface DeliveryShipment {
  id: string
  quantity: number
  deliveredOn: string
  comment: string | null
  originalName: string | null
  mimeType: string | null
}

export interface DeliveryLine {
  id: string
  unitType: string
  quantity: number
  deliveryMonth: number
  deliveryYear: number
  shipments: DeliveryShipment[]
}

export function deliveredQuantity(shipments: readonly { quantity: number }[]) {
  return shipments.reduce((total, shipment) => total + shipment.quantity, 0)
}
