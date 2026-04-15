import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatDate, STATUS_LABELS } from "@/lib/utils"
import { StatusBadge } from "@/components/opportunities/status-badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { PipelineBarChart, WaitingOnPieChart, RfqTrendChart } from "@/components/dashboard/charts"
import { PeriodSelector } from "@/components/dashboard/period-selector"
import Link from "next/link"
import { Briefcase, CheckCircle, XCircle, Clock, TrendingUp, Send, Timer } from "lucide-react"

// ─── Period helpers ───────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "90d" | "year"

function getPeriodStart(period: Period, now: Date): Date {
  if (period === "year") {
    return new Date(now.getFullYear(), 0, 1)
  }
  const days = period === "7d" ? 7 : period === "30d" ? 30 : 90
  const d = new Date(now)
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d
}

type TrendBucket = { label: string; rfq: number; quotes: number }

function buildTrend(
  period: Period,
  rfqDates: Date[],
  quoteDates: Date[],
  now: Date
): TrendBucket[] {
  function startOfDay(d: Date): Date {
    const c = new Date(d)
    c.setHours(0, 0, 0, 0)
    return c
  }
  function dayLabel(d: Date): string {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }
  function monthLabel(d: Date): string {
    return d.toLocaleDateString("en-GB", { month: "short" })
  }
  function countIn(dates: Date[], from: Date, to: Date): number {
    return dates.filter((d) => d >= from && d < to).length
  }

  if (period === "7d") {
    return Array.from({ length: 7 }, (_, i) => {
      const day = startOfDay(new Date(now))
      day.setDate(day.getDate() - (6 - i))
      const next = new Date(day)
      next.setDate(next.getDate() + 1)
      return {
        label: dayLabel(day),
        rfq: countIn(rfqDates, day, next),
        quotes: countIn(quoteDates, day, next),
      }
    })
  }

  if (period === "30d") {
    // 5 rolling weeks (most recent week last)
    return Array.from({ length: 5 }, (_, i) => {
      const weekEnd = startOfDay(new Date(now))
      weekEnd.setDate(weekEnd.getDate() - (4 - i) * 7)
      const weekStart = new Date(weekEnd)
      weekStart.setDate(weekStart.getDate() - 6)
      const next = new Date(weekEnd)
      next.setDate(next.getDate() + 1)
      return {
        label: dayLabel(weekStart),
        rfq: countIn(rfqDates, weekStart, next),
        quotes: countIn(quoteDates, weekStart, next),
      }
    })
  }

  if (period === "90d") {
    // 13 rolling weeks
    return Array.from({ length: 13 }, (_, i) => {
      const weekEnd = startOfDay(new Date(now))
      weekEnd.setDate(weekEnd.getDate() - (12 - i) * 7)
      const weekStart = new Date(weekEnd)
      weekStart.setDate(weekStart.getDate() - 6)
      const next = new Date(weekEnd)
      next.setDate(next.getDate() + 1)
      return {
        label: dayLabel(weekStart),
        rfq: countIn(rfqDates, weekStart, next),
        quotes: countIn(quoteDates, weekStart, next),
      }
    })
  }

  // year: 12 calendar months
  return Array.from({ length: 12 }, (_, i) => {
    const month = now.getMonth() - 11 + i
    const year = now.getFullYear() + Math.floor(month / 12)
    const monthNorm = ((month % 12) + 12) % 12
    const from = new Date(year, monthNorm, 1)
    const to = new Date(year, monthNorm + 1, 1)
    return {
      label: monthLabel(from),
      rfq: countIn(rfqDates, from, to),
      quotes: countIn(quoteDates, from, to),
    }
  })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const [session, params] = await Promise.all([
    getServerSession(authOptions),
    searchParams,
  ])

  const period = (["7d", "30d", "90d", "year"].includes(params.period ?? "")
    ? params.period
    : "30d") as Period

  const now = new Date()
  const periodStart = getPeriodStart(period, now)

  const [
    // Pipeline KPIs (all-time)
    activeCount,
    deliveredCount,
    cancelledCount,
    pendingCustomerCount,
    byStatus,
    byWaitingOn,
    recent,
    // Quote section (period-scoped)
    rfqsReceived,
    quotesShared,
    rfqRaw,
    quoteRaw,
    avgDaysRaw,
  ] = await Promise.all([
    db.opportunity.count({ where: { status: { notIn: ["DELIVERED", "CANCELLED"] } } }),
    db.opportunity.count({ where: { status: "DELIVERED" } }),
    db.opportunity.count({ where: { status: "CANCELLED" } }),
    db.opportunity.count({ where: { waitingOn: "CUSTOMER" } }),
    db.opportunity.groupBy({
      by: ["status"],
      _count: { id: true },
      where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
      orderBy: { status: "asc" },
    }),
    db.opportunity.groupBy({
      by: ["waitingOn"],
      _count: { id: true },
      where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
    }),
    db.opportunity.findMany({
      take: 10,
      orderBy: { updatedAt: "desc" },
      include: { createdBy: { select: { name: true } } },
    }),
    // Period data
    db.opportunity.count({ where: { rfqDate: { gte: periodStart, lte: now } } }),
    db.opportunity.count({ where: { quoteSentDate: { gte: periodStart, lte: now } } }),
    db.opportunity.findMany({
      where: { rfqDate: { gte: periodStart, lte: now } },
      select: { rfqDate: true },
    }),
    db.opportunity.findMany({
      where: { quoteSentDate: { gte: periodStart, lte: now } },
      select: { quoteSentDate: true },
    }),
    db.opportunity.findMany({
      where: {
        quoteSentDate: { gte: periodStart, lte: now },
        rfqDate: { not: null },
      },
      select: { rfqDate: true, quoteSentDate: true },
    }),
  ])

  // Avg days RFQ → quote
  const avgDaysToQuote =
    avgDaysRaw.length > 0
      ? Math.round(
          avgDaysRaw.reduce((sum, o) => {
            return (
              sum +
              (o.quoteSentDate!.getTime() - o.rfqDate!.getTime()) /
                (1000 * 60 * 60 * 24)
            )
          }, 0) / avgDaysRaw.length
        )
      : null

  const rfqDates = rfqRaw.map((r) => r.rfqDate).filter((d): d is Date => d !== null)
  const quoteDates = quoteRaw
    .map((r) => r.quoteSentDate)
    .filter((d): d is Date => d !== null)
  const trendData = buildTrend(period, rfqDates, quoteDates, now)

  const statusData = byStatus.map((s) => ({ status: s.status, count: s._count.id }))
  const waitingData = byWaitingOn.map((w) => ({ waitingOn: w.waitingOn, count: w._count.id }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {session?.user.name}</p>
      </div>

      {/* ── Quote Activity ─────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Quote Activity</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {period === "year"
                ? `Jan 1 – today`
                : `Last ${period === "7d" ? "7" : period === "30d" ? "30" : "90"} days`}
            </p>
          </div>
          <PeriodSelector current={period} />
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <KpiTile
            icon={<TrendingUp size={16} className="text-sky-500" />}
            bg="bg-sky-50"
            label="RFQs Received"
            value={rfqsReceived}
            unit=""
          />
          <KpiTile
            icon={<Send size={16} className="text-violet-500" />}
            bg="bg-violet-50"
            label="Quotes Shared"
            value={quotesShared}
            unit=""
          />
          <KpiTile
            icon={<Timer size={16} className="text-amber-500" />}
            bg="bg-amber-50"
            label="Avg Days to Quote"
            value={avgDaysToQuote ?? "—"}
            unit={avgDaysToQuote !== null ? "days" : ""}
          />
        </div>

        {/* Trend chart */}
        <RfqTrendChart data={trendData} />
      </div>

      {/* ── Pipeline KPIs ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Active</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{activeCount}</p>
            </div>
            <div className="p-2 bg-gray-100 rounded-lg">
              <Briefcase size={18} className="text-gray-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Pending Customer</p>
              <p className="text-3xl font-bold text-orange-500 mt-1">{pendingCustomerCount}</p>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg">
              <Clock size={18} className="text-orange-500" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Delivered</p>
              <p className="text-3xl font-bold text-green-600 mt-1">{deliveredCount}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg">
              <CheckCircle size={18} className="text-green-600" />
            </div>
          </div>
        </Card>

        <Card>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-500">Cancelled</p>
              <p className="text-3xl font-bold text-red-500 mt-1">{cancelledCount}</p>
            </div>
            <div className="p-2 bg-red-50 rounded-lg">
              <XCircle size={18} className="text-red-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* ── Pipeline charts ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Active Pipeline by Stage</CardTitle>
          </CardHeader>
          <PipelineBarChart data={statusData} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending</CardTitle>
          </CardHeader>
          <WaitingOnPieChart data={waitingData} />
        </Card>
      </div>

      {/* ── Recent Activity ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <Link href="/opportunities" className="text-xs text-gray-500 hover:text-gray-700">
            View all →
          </Link>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left pb-2 text-xs font-semibold text-gray-400">Opportunity</th>
                <th className="text-left pb-2 text-xs font-semibold text-gray-400 hidden sm:table-cell">
                  Customer
                </th>
                <th className="text-left pb-2 text-xs font-semibold text-gray-400">Status</th>
                <th className="text-left pb-2 text-xs font-semibold text-gray-400 hidden lg:table-cell">
                  Updated
                </th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 text-gray-400 text-center text-sm">
                    No opportunities yet.{" "}
                    <Link href="/opportunities/new" className="underline">
                      Create the first one
                    </Link>
                  </td>
                </tr>
              )}
              {recent.map((opp) => (
                <tr key={opp.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-3 pr-4">
                    <Link
                      href={`/opportunities/${opp.id}`}
                      className="font-medium text-gray-900 hover:text-gray-600 transition-colors"
                    >
                      {opp.title}
                    </Link>
                    {opp.internalId && (
                      <div className="text-xs text-gray-400">{opp.internalId}</div>
                    )}
                  </td>
                  <td className="py-3 pr-4 text-gray-600 hidden sm:table-cell">{opp.customer}</td>
                  <td className="py-3 pr-4">
                    <StatusBadge status={opp.status} />
                  </td>
                  <td className="py-3 text-gray-400 hidden lg:table-cell">
                    {formatDate(opp.updatedAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

// ─── KPI tile ──────────────────────────────────────────────────────────────

function KpiTile({
  icon,
  bg,
  label,
  value,
  unit,
}: {
  icon: React.ReactNode
  bg: string
  label: string
  value: number | string
  unit: string
}) {
  return (
    <div className="flex items-start gap-3">
      <div className={`p-2 rounded-lg flex-shrink-0 ${bg}`}>{icon}</div>
      <div>
        <p className="text-xs font-medium text-gray-500">{label}</p>
        <div className="flex items-baseline gap-1 mt-0.5">
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {unit && <p className="text-xs text-gray-400">{unit}</p>}
        </div>
      </div>
    </div>
  )
}
