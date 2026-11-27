import { todayISO } from "@/shared/lib/utils"

export function deliveryT0(advancePaymentDate: string | Date | null, today = todayISO()) {
  return advancePaymentDate instanceof Date ? advancePaymentDate.toISOString().slice(0, 10) : advancePaymentDate?.slice(0, 10) ?? today
}

export function calculateDeliveryDate(t0: string, offsetMonths: number) {
  const [year, month, day] = t0.split("-").map(Number)
  const endOfMonth = new Date(Date.UTC(year, month + offsetMonths, 0)).getUTCDate()
  return new Date(Date.UTC(year, month - 1 + offsetMonths, Math.min(day, endOfMonth))).toISOString().slice(0, 10)
}

export function scheduledDeliveryMonth(line: {
  overrideDate: string | Date | null
  offsetMonths: number | null
  deliveryMonth: number | null
  deliveryYear: number | null
}, t0: string) {
  const date = line.overrideDate instanceof Date ? line.overrideDate.toISOString() : line.overrideDate
  if (date || line.offsetMonths !== null) {
    const [year, month] = (date ?? calculateDeliveryDate(t0, line.offsetMonths!)).split("-").map(Number)
    return { year, month }
  }
  if (line.deliveryYear === null || line.deliveryMonth === null) return null
  return { year: line.deliveryYear, month: line.deliveryMonth }
}
