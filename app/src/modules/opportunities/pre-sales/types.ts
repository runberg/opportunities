export const PRE_SALES_EDITABLE_STAGES = ["NEW", "RFQ_RECEIVED"] as const

export function canEditPreSalesCosts(status: string) {
  return PRE_SALES_EDITABLE_STAGES.some((stage) => stage === status)
}

export interface PreSalesCostItem {
  id: string
  item: string
  estimatedAmount: string
  note: string | null
}

export interface PreSalesEstimate {
  items: PreSalesCostItem[]
  total: string
}
