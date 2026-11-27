"use client"

import { Panel } from "@/shared/components/ui/panel"
import { useRef, useState } from "react"
import Link from "next/link"
import { CalendarDays, ChevronLeft, ChevronRight, Lock, Package } from "lucide-react"
import { StatusBadge } from "./status-badge"
import { Dialog } from "@/shared/components/ui/dialog"
import { DELIVERY_TYPE_LABELS } from "../deliveries/types"
import type { OverviewLine, TimelineRow } from "../deliveries/overview"

const monthFormatter = new Intl.DateTimeFormat("en-GB", { month: "short", year: "numeric", timeZone: "UTC" })
const dateFormatter = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
const numberFormatter = new Intl.NumberFormat("en-GB")
const milestoneTones = { FAT: "bg-blue-100 text-blue-800", SAT: "bg-violet-100 text-violet-700", HANDOVER: "bg-emerald-100 text-emerald-700" }

function monthLabel(month: string) {
  return monthFormatter.format(new Date(month + "-01"))
}

function dateLabel(date: string) {
  return date.length === 7 ? monthLabel(date) : dateFormatter.format(new Date(date))
}

function plannedQuantity(lines: readonly OverviewLine[]) {
  return lines.reduce((total, line) => total + line.quantity, 0)
}

function calendarMonths(today: string) {
  const [year, month] = today.split("-").map(Number)
  return Array.from({ length: 24 }, (_, offset) => new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7))
}

function TimelineCell({ lines, label, onOpen }: {
  readonly lines: OverviewLine[]
  readonly label: string
  readonly onOpen: () => void
}) {
  if (!lines.length) return null
  const quantity = numberFormatter.format(plannedQuantity(lines))
  return (
    <button type="button" onClick={onOpen} aria-label={quantity + " planned · " + label}
      className="w-full rounded-md border border-blue-500/25 bg-blue-100 px-2 py-0.5 text-center text-lg font-semibold tabular-nums text-blue-800 hover:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
      {quantity}
    </button>
  )
}

const productColors = ["bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500", "bg-cyan-500"]

function ProductOverview({ rows, onOpen }: {
  readonly rows: TimelineRow[]
  readonly onOpen: (rowId: string) => void
}) {
  const products = rows.map((row) => ({
    ...row,
    quantity: plannedQuantity(Object.values(row.months).flat()),
  })).sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
  const total = products.reduce((sum, product) => sum + product.quantity, 0)
  return (
    <Panel aria-labelledby="product-overview-heading" className="overflow-hidden">
      <div className="flex items-center gap-2 border-b border-gray-200 bg-gray-50 px-3 py-2">
        <Package size={16} aria-hidden="true" className="text-blue-500" />
        <h2 id="product-overview-heading" className="text-sm font-semibold text-gray-900">Planned quantities by product</h2>
      </div>
      <div className="flex items-stretch gap-2 overflow-x-auto px-3 py-2">
        <div className="flex min-w-24 shrink-0 flex-col justify-center rounded-md bg-blue-100 px-3 py-1.5 text-blue-800">
          <span className="text-xs font-medium">Total planned</span>
          <strong className="text-xl font-semibold tabular-nums">{numberFormatter.format(total)}</strong>
        </div>
        {products.map((product, index) => (
          <button key={product.id} type="button" onClick={() => onOpen(product.id)} title={product.name}
            className="flex min-w-28 max-w-48 shrink-0 items-center gap-2 rounded-md border border-gray-200 px-3 py-1.5 text-left hover:border-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500">
            <div className="min-w-0">
              <span className="flex min-w-0 items-center gap-1.5 text-xs text-gray-600">
                <span className={productColors[index % productColors.length] + " size-2 shrink-0 rounded-full"} aria-hidden="true" />
                <span className="truncate">{product.name}</span>
              </span>
              <strong className="text-xl font-semibold tabular-nums text-gray-900">{numberFormatter.format(product.quantity)}</strong>
            </div>
            <ChevronRight size={13} aria-hidden="true" className="ml-auto shrink-0 text-gray-400" />
          </button>
        ))}
        {products.length === 0 && <p className="self-center text-sm text-gray-600">No planned deliveries in this view.</p>}
      </div>
    </Panel>
  )
}

function IconButton({ label, children, onClick, disabled }: {
  readonly label: string
  readonly children: React.ReactNode
  readonly onClick: () => void
  readonly disabled?: boolean
}) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} disabled={disabled}
      className="rounded-md border border-gray-200 bg-white p-1.5 text-gray-700 hover:border-blue-500 disabled:opacity-40">
      {children}
    </button>
  )
}

function OpportunityBreakdown({ lines }: { readonly lines: (OverviewLine & { product: string })[] }) {
  const groups = new Map<string, typeof lines>()
  for (const line of lines) {
    const group = groups.get(line.opportunity.id)
    if (group) group.push(line)
    else groups.set(line.opportunity.id, [line])
  }

  return (
    <div className="space-y-4">
      {[...groups.values()].map((deliveries) => {
        const { opportunity } = deliveries[0]
        const fields = [
          { label: "Customer", value: opportunity.customer },
          { label: "Opportunity ID", value: opportunity.internalId },
          { label: "Reference", value: opportunity.reference },
          { label: "Project code", value: opportunity.projectCode },
          { label: "Product / service", value: opportunity.product },
          { label: "Countersigned", value: opportunity.countersignedOn && dateLabel(opportunity.countersignedOn) },
          { label: "Advance payment", value: opportunity.advancePaidOn && dateLabel(opportunity.advancePaidOn) },
        ].filter((field) => field.value)

        return (
          <article key={opportunity.id} className="rounded-lg border border-gray-700 p-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link href={opportunity.href} className="inline-flex items-center gap-1 text-sm font-semibold text-blue-300 hover:underline">
                {opportunity.title}<ChevronRight size={14} aria-hidden="true" />
              </Link>
              <StatusBadge status={opportunity.status} />
            </div>
            <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
              {fields.map(({ label, value }) => (
                <div key={label} className="break-words"><dt className="text-gray-400">{label}</dt><dd className="text-gray-100">{value}</dd></div>
              ))}
            </dl>
            <ul className="mt-3 divide-y divide-gray-700 border-t border-gray-700">
              {deliveries.map((line) => (
                <li key={line.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2 text-xs text-gray-300 last:pb-0">
                  <span className="font-medium text-gray-100">{line.product}</span>
                  <span className={milestoneTones[line.type] + " rounded-md px-1.5 py-0.5"}>{DELIVERY_TYPE_LABELS[line.type]}</span>
                  <span className="inline-flex items-center gap-1">
                    {dateLabel(line.date)}{line.locked && <span title="Manual date override"><Lock size={12} aria-label="Date locked" /></span>}
                  </span>
                  <span className="ml-auto">{numberFormatter.format(line.completed)} / {numberFormatter.format(line.quantity)} completed</span>
                </li>
              ))}
            </ul>
          </article>
        )
      })}
    </div>
  )
}

export function DeliveryTimeline({ rows, today }: { readonly rows: TimelineRow[]; readonly today: string }) {
  const [selected, setSelected] = useState<{ rowId?: string; month?: string } | null>(null)
  const [productPage, setProductPage] = useState(0)
  const viewport = useRef<HTMLDivElement>(null)
  const pageSize = 5
  const lastPage = Math.max(0, Math.ceil(rows.length / pageSize) - 1)
  const visibleRows = rows.slice(productPage * pageSize, (productPage + 1) * pageSize)
  const months = calendarMonths(today)

  function scrollMonths(direction: number) {
    const element = viewport.current
    if (element) element.scrollBy({ left: direction * Math.max(96, element.clientWidth - 192), behavior: "smooth" })
  }
  const monthTotals = months.map((month) => rows.flatMap((row) => row.months[month] ?? []))
  const selectedRow = rows.find((row) => row.id === selected?.rowId)
  const selectedMonth = selected?.month
  const matchingRows = selectedRow ? [selectedRow] : rows
  const lines = selected ? matchingRows.flatMap((row) => {
    const deliveries = selectedMonth ? row.months[selectedMonth] ?? [] : Object.values(row.months).flat()
    return deliveries.map((line) => ({ ...line, product: row.name }))
  }).sort((a, b) => a.date.localeCompare(b.date) || a.opportunity.title.localeCompare(b.opportunity.title)) : []
  const modalTitle = [selectedRow?.name, selectedMonth && monthLabel(selectedMonth)].filter(Boolean).join(" · ")

  return (
    <>
      <ProductOverview rows={rows} onOpen={(rowId) => setSelected({ rowId })} />
      <Panel aria-labelledby="delivery-calendar-heading" className="overflow-hidden">
        <div className="flex items-center gap-3 border-b border-gray-200 bg-gray-50 px-3 py-2">
          <span className="rounded-lg bg-violet-100 p-2.5 text-violet-700"><CalendarDays size={20} aria-hidden="true" /></span>
          <div>
            <h2 id="delivery-calendar-heading" className="text-base font-semibold text-gray-900">Delivery calendar</h2>
            <p className="text-xs text-gray-600">{monthLabel(months[0])} – {monthLabel(months[months.length - 1])}</p>
          </div>
          <div className="ml-auto flex items-center gap-1">
            <IconButton label="Earlier months" onClick={() => scrollMonths(-1)}><ChevronLeft size={16} /></IconButton>
            <IconButton label="Later months" onClick={() => scrollMonths(1)}><ChevronRight size={16} /></IconButton>
          </div>
        </div>
        <div ref={viewport} className="overflow-x-auto">
          <table className="w-max border-separate border-spacing-0 text-sm">
            <caption className="sr-only">Planned quantities by product over the next 24 months</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky left-0 z-10 w-28 min-w-28 border-b border-r border-gray-200 bg-gray-50 px-3 py-3 text-left text-xs font-semibold text-gray-600 sm:w-48 sm:min-w-48">Product</th>
                {months.map((month) => (
                  <th key={month} scope="col" className="min-w-24 whitespace-nowrap border-b border-r border-gray-200 bg-gray-50 px-2 py-3 text-center text-xs font-semibold text-gray-900">{monthLabel(month)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id}>
                  <th scope="row" className="sticky left-0 z-10 max-w-48 break-words border-b border-r border-gray-200 bg-white px-3 py-2 text-left font-medium text-gray-900">{row.name}</th>
                  {months.map((month) => (
                    <td key={month} className="h-10 border-b border-r border-gray-200 px-2 py-1 text-center">
                      <TimelineCell lines={row.months[month] ?? []} label={row.name + " · " + monthLabel(month)}
                        onOpen={() => setSelected({ rowId: row.id, month })} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-50">
                <th scope="row" className="sticky left-0 z-10 border-r border-gray-200 bg-gray-50 px-3 py-3 text-left text-xs font-semibold text-gray-900">Monthly total</th>
                {months.map((month, index) => (
                  <td key={month} className="border-r border-gray-200 px-2 py-1.5">
                    <TimelineCell lines={monthTotals[index]} label={"All products · " + monthLabel(month)} onOpen={() => setSelected({ month })} />
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        {lastPage > 0 && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-200 px-3 py-1 text-xs text-gray-600">
            <span>Products {productPage * pageSize + 1}–{Math.min((productPage + 1) * pageSize, rows.length)} of {rows.length}</span>
            <IconButton label="Previous products" disabled={productPage === 0} onClick={() => setProductPage((page) => page - 1)}><ChevronLeft size={15} /></IconButton>
            <IconButton label="Next products" disabled={productPage === lastPage} onClick={() => setProductPage((page) => page + 1)}><ChevronRight size={15} /></IconButton>
          </div>
        )}
      </Panel>
      <Dialog open={Boolean(selected)} onClose={() => setSelected(null)}
        title={modalTitle || "Delivery breakdown"} className="max-w-2xl">
        <OpportunityBreakdown lines={lines} />
      </Dialog>
    </>
  )
}
