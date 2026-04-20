"use client"

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts"
import { STATUS_LABELS } from "@/lib/utils"
import { useTheme } from "@/components/theme/theme-provider"

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

interface RfqTrendProps {
  data: { label: string; rfq: number; quotes: number }[]
}

export function RfqTrendChart({ data }: RfqTrendProps) {
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
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip {...tooltip} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }}
          formatter={(value) => (value === "rfq" ? "RFQs received" : "Quotes shared")}
        />
        <Bar dataKey="rfq" fill="#374151" radius={[3, 3, 0, 0]} maxBarSize={24} />
        <Bar dataKey="quotes" fill="#9ca3af" radius={[3, 3, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── EL Trend Chart ──────────────────────────────────────────────────────────

interface ElTrendProps {
  data: { label: string; requested: number; drafted: number; signed: number }[]
}

export function ElTrendChart({ data }: ElTrendProps) {
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
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#9ca3af" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip {...tooltip} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#6b7280", paddingTop: 8 }}
          formatter={(value) =>
            value === "requested" ? "EL requested" : value === "drafted" ? "EL draft shared" : "EL signed shared"
          }
        />
        <Bar dataKey="requested" fill="#374151" radius={[3, 3, 0, 0]} maxBarSize={20} />
        <Bar dataKey="drafted" fill="#9ca3af" radius={[3, 3, 0, 0]} maxBarSize={20} />
        <Bar dataKey="signed" fill="#6ee7b7" radius={[3, 3, 0, 0]} maxBarSize={20} />
      </BarChart>
    </ResponsiveContainer>
  )
}

const GRAY_SHADES = ["#111827", "#374151", "#6b7280", "#9ca3af", "#d1d5db", "#e5e7eb"]

interface PipelineBarProps {
  data: { status: string; count: number }[]
}

export function PipelineBarChart({ data }: PipelineBarProps) {
  const tooltip = useTooltipStyle()
  const formatted = data.map((d) => ({
    name: STATUS_LABELS[d.status] ?? d.status,
    count: d.count,
  }))

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={formatted} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
        <XAxis
          dataKey="name"
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          interval={0}
          angle={-20}
          textAnchor="end"
          height={50}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#6b7280" }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip {...tooltip} />
        <Bar dataKey="count" fill="#374151" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

interface WaitingOnPieProps {
  data: { waitingOn: string; count: number }[]
}

const WAITING_LABELS: Record<string, string> = {
  INTERNAL: "Internal",
  CUSTOMER: "Customer",
  NONE: "None",
}

export function WaitingOnPieChart({ data }: WaitingOnPieProps) {
  const tooltip = useTooltipStyle()
  const formatted = data
    .filter((d) => d.waitingOn !== "NONE")
    .map((d) => ({
      name: WAITING_LABELS[d.waitingOn] ?? d.waitingOn,
      value: d.count,
    }))

  if (formatted.length === 0) {
    return (
      <div className="h-[220px] flex items-center justify-center text-sm text-gray-400">
        No data
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={formatted}
          cx="50%"
          cy="45%"
          innerRadius={55}
          outerRadius={80}
          paddingAngle={3}
          dataKey="value"
        >
          {formatted.map((_, index) => (
            <Cell key={`cell-${index}`} fill={GRAY_SHADES[index % GRAY_SHADES.length]} />
          ))}
        </Pie>
        <Tooltip {...tooltip} />
        <Legend
          iconType="circle"
          iconSize={8}
          wrapperStyle={{ fontSize: 11, color: "#6b7280" }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
