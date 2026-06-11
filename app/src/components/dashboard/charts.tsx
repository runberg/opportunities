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
import { useTheme } from "@/components/theme/theme-provider"

export type DrillTarget = {
  title: string
  dateField: string
  fromISO: string
  toISO: string
}

function useTooltipStyle() {
  const { theme } = useTheme()
  const dark = theme === "dark"
  return {
    contentStyle: {
      background: dark ? "#1c2d40" : "#ffffff",
      border: `1px solid ${dark ? "#253d55" : "#e5e7eb"}`,
      borderRadius: 8,
      fontSize: 12,
      color: dark ? "#e8f1f8" : "#111827",
    },
    cursor: { fill: dark ? "rgba(255,255,255,0.04)" : "#f9fafb" },
  }
}

// ─── RFQ Trend Chart ─────────────────────────────────────────────────────────

export interface RfqTrendBucket {
  label: string; rfq: number; quotes: number; fromISO: string; toISO: string
}

export function RfqTrendChart({ data, onBarClick }: {
  data: RfqTrendBucket[]
  onBarClick?: (target: DrillTarget) => void
}) {
  const tooltip = useTooltipStyle()
  if (data.every((d) => d.rfq === 0 && d.quotes === 0)) {
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
          style={onBarClick ? { cursor: "pointer" } : undefined}
          onClick={onBarClick ? (row: RfqTrendBucket) => onBarClick({ title: `RFQs Received — ${row.label}`, dateField: "rfqDate", fromISO: row.fromISO, toISO: row.toISO }) : undefined} />
        <Bar dataKey="quotes" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={24}
          style={onBarClick ? { cursor: "pointer" } : undefined}
          onClick={onBarClick ? (row: RfqTrendBucket) => onBarClick({ title: `Quotes Shared — ${row.label}`, dateField: "quoteSentDate", fromISO: row.fromISO, toISO: row.toISO }) : undefined} />
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
  data: ElTrendBucket[]
  onBarClick?: (target: DrillTarget) => void
}) {
  const tooltip = useTooltipStyle()
  if (data.every((d) => d.requested === 0 && d.drafted === 0 && d.signed === 0)) {
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
          style={onBarClick ? { cursor: "pointer" } : undefined}
          onClick={onBarClick ? (row: ElTrendBucket) => onBarClick({ title: `ELs Requested — ${row.label}`, dateField: "elRequestedDate", fromISO: row.fromISO, toISO: row.toISO }) : undefined} />
        <Bar dataKey="drafted" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={20}
          style={onBarClick ? { cursor: "pointer" } : undefined}
          onClick={onBarClick ? (row: ElTrendBucket) => onBarClick({ title: `EL Drafts Shared — ${row.label}`, dateField: "elDraftSharedDate", fromISO: row.fromISO, toISO: row.toISO }) : undefined} />
        <Bar dataKey="signed" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={20}
          style={onBarClick ? { cursor: "pointer" } : undefined}
          onClick={onBarClick ? (row: ElTrendBucket) => onBarClick({ title: `EL Signed Shared — ${row.label}`, dateField: "elSignedSharedDate", fromISO: row.fromISO, toISO: row.toISO }) : undefined} />
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
  data: ProdTrendBucket[]
  onBarClick?: (target: DrillTarget) => void
}) {
  const tooltip = useTooltipStyle()
  if (data.every((d) => d.countersigned === 0 && d.advancePaid === 0 && d.fatPassed === 0 && d.delivered === 0)) {
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
          style={onBarClick ? { cursor: "pointer" } : undefined}
          onClick={onBarClick ? (row: ProdTrendBucket) => onBarClick({ title: `Contract Countersigned — ${row.label}`, dateField: "elCountersignedDate", fromISO: row.fromISO, toISO: row.toISO }) : undefined} />
        <Bar dataKey="advancePaid" fill="#f59e0b" radius={[3, 3, 0, 0]} maxBarSize={18}
          style={onBarClick ? { cursor: "pointer" } : undefined}
          onClick={onBarClick ? (row: ProdTrendBucket) => onBarClick({ title: `Advance Payments — ${row.label}`, dateField: "advancePaymentDate", fromISO: row.fromISO, toISO: row.toISO }) : undefined} />
        <Bar dataKey="fatPassed" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={18}
          style={onBarClick ? { cursor: "pointer" } : undefined}
          onClick={onBarClick ? (row: ProdTrendBucket) => onBarClick({ title: `FAT Passed — ${row.label}`, dateField: "fatPassedDate", fromISO: row.fromISO, toISO: row.toISO }) : undefined} />
        <Bar dataKey="delivered" fill="#059669" radius={[3, 3, 0, 0]} maxBarSize={18}
          style={onBarClick ? { cursor: "pointer" } : undefined}
          onClick={onBarClick ? (row: ProdTrendBucket) => onBarClick({ title: `Delivered — ${row.label}`, dateField: "deliveredDate", fromISO: row.fromISO, toISO: row.toISO }) : undefined} />
      </BarChart>
    </ResponsiveContainer>
  )
}

