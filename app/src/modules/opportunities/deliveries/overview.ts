import { calculateDeliveryDate, deliveryT0 } from "./schedule"
import { isOpportunitySigned, opportunityBasePath } from "@/shared/lib/utils"
import type { DeliveryType } from "./types"

export const DELIVERY_VIEWS = [
  { id: "forecast", label: "Forecast", description: "Unsigned quotes and ELs, assuming payment starts today." },
  { id: "awaiting-payment", label: "Awaiting Advance Payment", description: "Countersigned agreements with a rolling schedule until advance payment arrives." },
  { id: "committed", label: "Committed Schedule", description: "Countersigned agreements scheduled from the advance payment receipt date." },
] as const

export type DeliveryView = (typeof DELIVERY_VIEWS)[number]["id"]

export function deliveryView(opportunity: { status: string; elCountersignedDate: Date | null; advancePaymentDate: Date | null }): DeliveryView {
  if (!opportunity.elCountersignedDate && !isOpportunitySigned(opportunity.status)) return "forecast"
  return opportunity.advancePaymentDate ? "committed" : "awaiting-payment"
}

export type OverviewLine = {
  id: string
  type: DeliveryType
  date: string
  locked: boolean
  quantity: number
  completed: number
  opportunity: {
    id: string; title: string; customer: string; internalId: string | null; href: string; status: string
    reference: string | null; projectCode: string | null; product: string | null
    countersignedOn: string | null; advancePaidOn: string | null
  }
}

export type TimelineRow = {
  id: string
  name: string
  months: Record<string, OverviewLine[]>
}

export function overviewDates(plan: {
  overrideDate: Date | null; offsetMonths: number | null; deliveryYear: number | null; deliveryMonth: number | null
}, advancePaymentDate: Date | null, today: string) {
  if (plan.overrideDate) return plan.overrideDate.toISOString().slice(0, 10)
  if (plan.offsetMonths !== null) return calculateDeliveryDate(deliveryT0(advancePaymentDate, today), plan.offsetMonths)
  if (plan.deliveryYear === null || plan.deliveryMonth === null) return null
  return `${plan.deliveryYear}-${String(plan.deliveryMonth).padStart(2, "0")}`
}

export function overviewOpportunity(opportunity: Omit<OverviewLine["opportunity"], "href" | "countersignedOn" | "advancePaidOn"> & {
  elCountersignedDate: Date | null; advancePaymentDate: Date | null
}): OverviewLine["opportunity"] {
  const { elCountersignedDate, advancePaymentDate, ...details } = opportunity
  return {
    ...details,
    href: `${opportunityBasePath(details.status)}?open=${encodeURIComponent(details.id)}`,
    countersignedOn: elCountersignedDate?.toISOString().slice(0, 10) ?? null,
    advancePaidOn: advancePaymentDate?.toISOString().slice(0, 10) ?? null,
  }
}
