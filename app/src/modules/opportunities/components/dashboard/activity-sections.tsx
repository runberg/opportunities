"use client"

import { useState } from "react"
import { cn } from "@/shared/lib/utils"
import { RfqTrendChart, ElTrendChart, ProductionTrendChart } from "@/modules/opportunities/components/dashboard/charts"
import { DateDrillModal } from "@/modules/opportunities/components/dashboard/date-drill-modal"
import type { DrillTarget, RfqTrendBucket, ElTrendBucket, ProdTrendBucket } from "@/modules/opportunities/components/dashboard/charts"

// ─── Shared KPI tile ──────────────────────────────────────────────────────────

function KpiTile({
  label, value, unit = "", color = "text-gray-900", onClick,
}: {
  readonly label: string; readonly value: number | string; readonly unit?: string; readonly color?: string; readonly onClick?: () => void
}) {
  if (onClick) {
    return (
      <button type="button" className="group cursor-pointer text-left" onClick={onClick}>
        <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{label}</p>
        <div className="flex items-baseline gap-1.5">
          <span className={cn("text-3xl font-bold transition-opacity group-hover:opacity-70", color)}>{value}</span>
          {unit && <span className="text-sm text-gray-400">{unit}</span>}
        </div>
      </button>
    )
  }
  return (
    <div className="group">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className={cn("text-3xl font-bold", color)}>{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
    </div>
  )
}

// ─── Quote Activity ────────────────────────────────────────────────────────────

export function QuoteActivitySection({
  kpiRfq, kpiQuotes, kpiAvgDays,
  trendData, periodFromISO, periodToISO,
  currentUserId, isAdmin,
}: {
  readonly kpiRfq: number; readonly kpiQuotes: number; readonly kpiAvgDays: number | null
  readonly trendData: RfqTrendBucket[]
  readonly periodFromISO: string; readonly periodToISO: string
  readonly currentUserId: string; readonly isAdmin: boolean
}) {
  const [drill, setDrill] = useState<DrillTarget | null>(null)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Quote Activity</h2>

      <div className="grid grid-cols-3 gap-6 mb-6">
        <KpiTile label="RFQs Received" value={kpiRfq} color="text-[#006fff]"
          onClick={() => setDrill({ title: "RFQs Received", dateField: "rfqDate", fromISO: periodFromISO, toISO: periodToISO })} />
        <KpiTile label="Quotes Shared" value={kpiQuotes} color="text-emerald-500"
          onClick={() => setDrill({ title: "Quotes Shared", dateField: "quoteSentDate", fromISO: periodFromISO, toISO: periodToISO })} />
        <KpiTile label="Avg Days to Quote" value={kpiAvgDays ?? "—"} unit={kpiAvgDays === null ? "" : "days"} color="text-gray-400" />
      </div>

      <RfqTrendChart data={trendData} onBarClick={setDrill} />

      {drill && (
        <DateDrillModal {...drill} currentUserId={currentUserId} isAdmin={isAdmin} onClose={() => setDrill(null)} />
      )}
    </div>
  )
}

// ─── EL Activity ──────────────────────────────────────────────────────────────

export function ElActivitySection({
  kpiRequested, kpiDrafted, kpiSigned, kpiAvgDays,
  trendData, periodFromISO, periodToISO,
  currentUserId, isAdmin,
}: {
  readonly kpiRequested: number; readonly kpiDrafted: number; readonly kpiSigned: number; readonly kpiAvgDays: number | null
  readonly trendData: ElTrendBucket[]
  readonly periodFromISO: string; readonly periodToISO: string
  readonly currentUserId: string; readonly isAdmin: boolean
}) {
  const [drill, setDrill] = useState<DrillTarget | null>(null)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-6">EL Activity</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
        <KpiTile label="ELs Requested" value={kpiRequested} color="text-[#006fff]"
          onClick={() => setDrill({ title: "ELs Requested", dateField: "elRequestedDate", fromISO: periodFromISO, toISO: periodToISO })} />
        <KpiTile label="EL Drafts Shared" value={kpiDrafted} color="text-amber-500"
          onClick={() => setDrill({ title: "EL Drafts Shared", dateField: "elDraftSharedDate", fromISO: periodFromISO, toISO: periodToISO })} />
        <KpiTile label="EL Signed Shared" value={kpiSigned} color="text-emerald-500"
          onClick={() => setDrill({ title: "EL Signed Shared", dateField: "elSignedSharedDate", fromISO: periodFromISO, toISO: periodToISO })} />
        <KpiTile label="Avg Days to Signed" value={kpiAvgDays ?? "—"} unit={kpiAvgDays === null ? "" : "days"} color="text-gray-400" />
      </div>

      <ElTrendChart data={trendData} onBarClick={setDrill} />

      {drill && (
        <DateDrillModal {...drill} currentUserId={currentUserId} isAdmin={isAdmin} onClose={() => setDrill(null)} />
      )}
    </div>
  )
}

// ─── Production Activity ──────────────────────────────────────────────────────

export function ProductionActivitySection({
  kpiCountersigned, kpiAdvance, kpiFat, kpiDelivered,
  trendData, periodFromISO, periodToISO,
  currentUserId, isAdmin,
}: {
  readonly kpiCountersigned: number; readonly kpiAdvance: number; readonly kpiFat: number; readonly kpiDelivered: number
  readonly trendData: ProdTrendBucket[]
  readonly periodFromISO: string; readonly periodToISO: string
  readonly currentUserId: string; readonly isAdmin: boolean
}) {
  const [drill, setDrill] = useState<DrillTarget | null>(null)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-6">Production Activity</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
        <KpiTile label="Countersigned" value={kpiCountersigned} color="text-[#006fff]"
          onClick={() => setDrill({ title: "Contract Countersigned", dateField: "elCountersignedDate", fromISO: periodFromISO, toISO: periodToISO })} />
        <KpiTile label="Advance Payments" value={kpiAdvance} color="text-amber-500"
          onClick={() => setDrill({ title: "Advance Payments", dateField: "advancePaymentDate", fromISO: periodFromISO, toISO: periodToISO })} />
        <KpiTile label="FAT Passed" value={kpiFat} color="text-emerald-500"
          onClick={() => setDrill({ title: "FAT Passed", dateField: "fatPassedDate", fromISO: periodFromISO, toISO: periodToISO })} />
        <KpiTile label="Delivered" value={kpiDelivered} color="text-[#059669]"
          onClick={() => setDrill({ title: "Delivered", dateField: "deliveredDate", fromISO: periodFromISO, toISO: periodToISO })} />
      </div>

      <ProductionTrendChart data={trendData} onBarClick={setDrill} />

      {drill && (
        <DateDrillModal {...drill} currentUserId={currentUserId} isAdmin={isAdmin} onClose={() => setDrill(null)} />
      )}
    </div>
  )
}
