"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { OpportunityModal } from "@/modules/opportunities/components/opportunity-modal"

export interface DeliveryPlanItem {
  id: string
  unitType: string
  quantity: number
  deliveryMonth: number
  deliveryYear: number
  opportunity: {
    id: string
    title: string
    internalId: string | null
    customer: string
  }
}

function monthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

function groupByMonth(items: DeliveryPlanItem[]): { key: string; month: number; year: number; items: DeliveryPlanItem[] }[] {
  const map = new Map<string, { month: number; year: number; items: DeliveryPlanItem[] }>()
  for (const item of items) {
    const key = `${item.deliveryYear}-${String(item.deliveryMonth).padStart(2, "0")}`
    if (!map.has(key)) map.set(key, { month: item.deliveryMonth, year: item.deliveryYear, items: [] })
    map.get(key)!.items.push(item)
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, v]) => ({ key, ...v }))
}

export function DeliveryPlan({ items, currentUserId, isAdmin }: {
  readonly items: DeliveryPlanItem[]
  readonly currentUserId: string
  readonly isAdmin: boolean
}) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)

  const groups = groupByMonth(items)

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-6">Delivery Plan</h2>

        {groups.length === 0 ? (
          <p className="text-sm text-gray-400">No planned deliveries.</p>
        ) : (
          <div className="flex flex-col gap-6">
            {groups.map((group) => (
              <div key={group.key}>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  {monthLabel(group.month, group.year)}
                </p>
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  {group.items.map((item, idx) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setOpenId(item.opportunity.id)}
                      className={`w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-gray-50 transition-colors ${idx > 0 ? "border-t border-gray-100" : ""}`}
                    >
                      <span className="text-sm font-semibold text-gray-800 w-10 text-right shrink-0">
                        {item.quantity}
                      </span>
                      <span className="text-sm text-gray-600 flex-1">{item.unitType}</span>
                      <span className="text-xs text-gray-400 shrink-0">
                        {item.opportunity.internalId ?? "—"}
                      </span>
                      <span className="text-sm text-gray-700 font-medium shrink-0 max-w-48 truncate">
                        {item.opportunity.title}
                      </span>
                      <span className="text-xs text-gray-400 shrink-0 max-w-32 truncate">
                        {item.opportunity.customer}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <OpportunityModal
        opportunityId={openId}
        onClose={() => { setOpenId(null); router.refresh() }}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </>
  )
}
