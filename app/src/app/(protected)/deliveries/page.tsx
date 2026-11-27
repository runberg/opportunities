import { viewTabClass } from "@/shared/components/ui/view-tab-styles"
import { PageHeader } from "@/shared/components/layout/page-header"
import Link from "next/link"
import { db } from "@/shared/lib/db"
import { requireSectionAccess } from "@/shared/lib/page-access"
import { todayISO } from "@/shared/lib/utils"
import { DeliveryTimeline } from "@/modules/opportunities/components/delivery-timeline"
import { DELIVERY_VIEWS, deliveryView, overviewDates, overviewOpportunity, type TimelineRow } from "@/modules/opportunities/deliveries/overview"
import { deliveredQuantity } from "@/modules/opportunities/deliveries/types"

export default async function DeliveriesPage({ searchParams }: {
  readonly searchParams: Promise<{ view?: string }>
}) {
  const [, params] = await Promise.all([requireSectionAccess("opportunities"), searchParams])
  const view = DELIVERY_VIEWS.find((item) => item.id === params.view) ?? DELIVERY_VIEWS[0]
  const plans = await db.expectedDelivery.findMany({
    where: { opportunity: { isArchived: false, status: { not: "CANCELLED" } } },
    select: {
      id: true, deliveryType: true, quantity: true, overrideDate: true, offsetMonths: true, deliveryMonth: true, deliveryYear: true,
      unitTypeEntry: { select: { id: true, name: true } },
      shipments: { select: { quantity: true } },
      opportunity: {
        select: {
          id: true, title: true, customer: true, internalId: true, status: true,
          reference: true, projectCode: true, product: true,
          advancePaymentDate: true, elCountersignedDate: true,
        },
      },
    },
  })
  const rows = new Map<string, TimelineRow>()
  const counts = new Map<string, number>()
  const today = todayISO()
  for (const plan of plans) {
    const group = deliveryView(plan.opportunity)
    const date = overviewDates(plan, group === "committed" ? plan.opportunity.advancePaymentDate : null, today)
    if (!date) continue
    counts.set(group, (counts.get(group) ?? 0) + 1)
    if (group !== view.id) continue
    const { id, name } = plan.unitTypeEntry
    const row = rows.get(id) ?? { id, name, months: {} }
    rows.set(id, row)
    const month = date.slice(0, 7)
    const lines = row.months[month] ?? (row.months[month] = [])
    lines.push({
      id: plan.id, type: plan.deliveryType, date, locked: Boolean(plan.overrideDate),
      quantity: plan.quantity, completed: deliveredQuantity(plan.shipments), opportunity: overviewOpportunity(plan.opportunity),
    })
  }
  const timeline = [...rows.values()].sort((a, b) => a.name.localeCompare(b.name))

  return (
    <div className="space-y-4">
      <PageHeader title="Delivery" description={view.description} className="mb-0" />
      <nav aria-label="Delivery views" className="flex flex-wrap gap-2">
        {DELIVERY_VIEWS.map((item) => (
          <Link key={item.id} href={`/deliveries?view=${item.id}`}
            aria-current={item.id === view.id ? "page" : undefined}
            className={viewTabClass(item.id === view.id)}>
            {item.label} <span className="ml-1 text-xs tabular-nums">({counts.get(item.id) ?? 0})</span>
          </Link>
        ))}
      </nav>
      <DeliveryTimeline key={view.id} rows={timeline} today={today} />
    </div>
  )
}
