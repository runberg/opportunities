"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"

export type DrillTarget = {
  title: string
  dateField: string
  fromISO: string
  toISO: string
}

function useTooltipStyle() {
  return {
    contentStyle: {
      background: "#1c2d40",
      border: "1px solid #253d55",
      borderRadius: 8,
      fontSize: 12,
      color: "#e8f1f8",
    },
    cursor: { fill: "rgba(255,255,255,0.04)" },
  }
}

// ─── Bar click helper ────────────────────────────────────────────────────────

type BucketRow = { label: string; fromISO: string; toISO: string }

function makeBarClickProps(
  onBarClick: ((t: DrillTarget) => void) | undefined,
  title: string,
  dateField: string,
) {
  if (!onBarClick) return {}
  return {
    style: { cursor: "pointer" },
    onClick: (row: BucketRow) => onBarClick({ title: `${title} — ${row.label}`, dateField, fromISO: row.fromISO, toISO: row.toISO }),
  }
}

// ─── RFQ Trend Chart ─────────────────────────────────────────────────────────

export interface RfqTrendBucket {
  label: string; rfq: number; quotes: number; fromISO: string; toISO: string
}

export function RfqTrendChart({ data, onBarClick }: {
  readonly data: RfqTrendBucket[]
  readonly onBarClick?: (target: DrillTarget) => void
}) {
  const tooltip = useTooltipStyle()
  if (data.every((d) => d.rfq + d.quotes === 0)) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
        No activity in this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barGap={2}>
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tooltip} />
        <Legend
          iconType="circle" iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }}
          formatter={(value) => (value === "rfq" ? "RFQs received" : "Quotes shared")}
        />
        <Bar dataKey="rfq" fill="#006fff" radius={[3, 3, 0, 0]} maxBarSize={24}
          {...makeBarClickProps(onBarClick, "RFQs Received", "rfqDate")} />
        <Bar dataKey="quotes" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={24}
          {...makeBarClickProps(onBarClick, "Quotes Shared", "quoteSentDate")} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── EL Trend Chart ──────────────────────────────────────────────────────────

const EL_LEGEND_LABELS: Record<string, string> = {
  requested: "EL requested",
  drafted: "EL draft shared",
  signed: "EL signed shared",
}

export interface ElTrendBucket {
  label: string; requested: number; drafted: number; signed: number; fromISO: string; toISO: string
}

export function ElTrendChart({ data, onBarClick }: {
  readonly data: ElTrendBucket[]
  readonly onBarClick?: (target: DrillTarget) => void
}) {
  const tooltip = useTooltipStyle()
  if (data.every((d) => d.requested + d.drafted + d.signed === 0)) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
        No activity in this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barGap={2}>
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tooltip} />
        <Legend
          iconType="circle" iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }}
          formatter={(value) => EL_LEGEND_LABELS[value] ?? value}
        />
        <Bar dataKey="requested" fill="#006fff" radius={[3, 3, 0, 0]} maxBarSize={20}
          {...makeBarClickProps(onBarClick, "ELs Requested", "elRequestedDate")} />
        <Bar dataKey="drafted" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={20}
          {...makeBarClickProps(onBarClick, "EL Drafts Shared", "elDraftSharedDate")} />
        <Bar dataKey="signed" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20}
          {...makeBarClickProps(onBarClick, "EL Signed Shared", "elSignedSharedDate")} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Production Trend Chart ───────────────────────────────────────────────────

const PROD_LEGEND_LABELS: Record<string, string> = {
  countersigned: "Contract countersigned",
  advancePaid: "Advance payment",
  fatPassed: "FAT passed",
  delivered: "Delivered",
}

export interface ProdTrendBucket {
  label: string; countersigned: number; advancePaid: number; fatPassed: number; delivered: number; fromISO: string; toISO: string
}

export function ProductionTrendChart({ data, onBarClick }: {
  readonly data: ProdTrendBucket[]
  readonly onBarClick?: (target: DrillTarget) => void
}) {
  const tooltip = useTooltipStyle()
  if (data.every((d) => d.countersigned + d.advancePaid + d.fatPassed + d.delivered === 0)) {
    return (
      <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
        No activity in this period
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }} barGap={2}>
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip {...tooltip} />
        <Legend
          iconType="circle" iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }}
          formatter={(value) => PROD_LEGEND_LABELS[value] ?? value}
        />
        <Bar dataKey="countersigned" fill="#006fff" radius={[3, 3, 0, 0]} maxBarSize={18}
          {...makeBarClickProps(onBarClick, "Contract Countersigned", "elCountersignedDate")} />
        <Bar dataKey="advancePaid" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={18}
          {...makeBarClickProps(onBarClick, "Advance Payments", "advancePaymentDate")} />
        <Bar dataKey="fatPassed" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={18}
          {...makeBarClickProps(onBarClick, "FAT Passed", "fatPassedDate")} />
        <Bar dataKey="delivered" fill="#059669" radius={[3, 3, 0, 0]} maxBarSize={18}
          {...makeBarClickProps(onBarClick, "Delivered", "deliveredDate")} />
      </BarChart>
    </ResponsiveContainer>
  )
}

