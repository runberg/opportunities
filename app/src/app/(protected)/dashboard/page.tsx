import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { RfqTrendChart, ElTrendChart } from "@/components/dashboard/charts"
import { PeriodSelector } from "@/components/dashboard/period-selector"

// ─── Period helpers ───────────────────────────────────────────────────────────

type Period = "7d" | "30d" | "90d" | "year" | "custom"

function getPeriodStart(period: Period, now: Date, customFrom?: string): Date {
  if (period === "custom" && customFrom) return new Date(customFrom)
  if (period === "year") return new Date(now.getFullYear(), 0, 1)
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
  now: Date,
  periodStart: Date
): TrendBucket[] {
  function startOfDay(d: Date): Date {
    const c = new Date(d); c.setHours(0, 0, 0, 0); return c
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
      const next = new Date(day); next.setDate(next.getDate() + 1)
      return { label: dayLabel(day), rfq: countIn(rfqDates, day, next), quotes: countIn(quoteDates, day, next) }
    })
  }

  if (period === "30d") {
    return Array.from({ length: 5 }, (_, i) => {
      const weekEnd = startOfDay(new Date(now))
      weekEnd.setDate(weekEnd.getDate() - (4 - i) * 7)
      const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6)
      const next = new Date(weekEnd); next.setDate(next.getDate() + 1)
      return { label: dayLabel(weekStart), rfq: countIn(rfqDates, weekStart, next), quotes: countIn(quoteDates, weekStart, next) }
    })
  }

  if (period === "90d") {
    return Array.from({ length: 13 }, (_, i) => {
      const weekEnd = startOfDay(new Date(now))
      weekEnd.setDate(weekEnd.getDate() - (12 - i) * 7)
      const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6)
      const next = new Date(weekEnd); next.setDate(next.getDate() + 1)
      return { label: dayLabel(weekStart), rfq: countIn(rfqDates, weekStart, next), quotes: countIn(quoteDates, weekStart, next) }
    })
  }

  if (period === "year") {
    return Array.from({ length: 12 }, (_, i) => {
      const month = now.getMonth() - 11 + i
      const year = now.getFullYear() + Math.floor(month / 12)
      const monthNorm = ((month % 12) + 12) % 12
      const from = new Date(year, monthNorm, 1)
      const to = new Date(year, monthNorm + 1, 1)
      return { label: monthLabel(from), rfq: countIn(rfqDates, from, to), quotes: countIn(quoteDates, from, to) }
    })
  }

  // custom: bucket size based on range length
  const rangeDays = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))

  if (rangeDays <= 14) {
    return Array.from({ length: rangeDays || 1 }, (_, i) => {
      const day = startOfDay(new Date(periodStart))
      day.setDate(day.getDate() + i)
      const next = new Date(day); next.setDate(next.getDate() + 1)
      return { label: dayLabel(day), rfq: countIn(rfqDates, day, next), quotes: countIn(quoteDates, day, next) }
    })
  }

  if (rangeDays <= 90) {
    const weeks = Math.ceil(rangeDays / 7)
    return Array.from({ length: weeks }, (_, i) => {
      const weekStart = startOfDay(new Date(periodStart))
      weekStart.setDate(weekStart.getDate() + i * 7)
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7)
      return { label: dayLabel(weekStart), rfq: countIn(rfqDates, weekStart, weekEnd), quotes: countIn(quoteDates, weekStart, weekEnd) }
    })
  }

  // monthly
  const months: TrendBucket[] = []
  const cursor = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1)
  while (cursor <= now) {
    const from = new Date(cursor)
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    months.push({ label: monthLabel(from), rfq: countIn(rfqDates, from, to), quotes: countIn(quoteDates, from, to) })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return months
}

type ElBucket = { label: string; requested: number; drafted: number; signed: number }

function buildElTrend(
  period: Period,
  requestedDates: Date[],
  draftedDates: Date[],
  signedDates: Date[],
  now: Date,
  periodStart: Date
): ElBucket[] {
  function startOfDay(d: Date): Date {
    const c = new Date(d); c.setHours(0, 0, 0, 0); return c
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
      const next = new Date(day); next.setDate(next.getDate() + 1)
      return { label: dayLabel(day), requested: countIn(requestedDates, day, next), drafted: countIn(draftedDates, day, next), signed: countIn(signedDates, day, next) }
    })
  }
  if (period === "30d") {
    return Array.from({ length: 5 }, (_, i) => {
      const weekEnd = startOfDay(new Date(now))
      weekEnd.setDate(weekEnd.getDate() - (4 - i) * 7)
      const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6)
      const next = new Date(weekEnd); next.setDate(next.getDate() + 1)
      return { label: dayLabel(weekStart), requested: countIn(requestedDates, weekStart, next), drafted: countIn(draftedDates, weekStart, next), signed: countIn(signedDates, weekStart, next) }
    })
  }
  if (period === "90d") {
    return Array.from({ length: 13 }, (_, i) => {
      const weekEnd = startOfDay(new Date(now))
      weekEnd.setDate(weekEnd.getDate() - (12 - i) * 7)
      const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6)
      const next = new Date(weekEnd); next.setDate(next.getDate() + 1)
      return { label: dayLabel(weekStart), requested: countIn(requestedDates, weekStart, next), drafted: countIn(draftedDates, weekStart, next), signed: countIn(signedDates, weekStart, next) }
    })
  }
  if (period === "year") {
    return Array.from({ length: 12 }, (_, i) => {
      const month = now.getMonth() - 11 + i
      const year = now.getFullYear() + Math.floor(month / 12)
      const monthNorm = ((month % 12) + 12) % 12
      const from = new Date(year, monthNorm, 1)
      const to = new Date(year, monthNorm + 1, 1)
      return { label: monthLabel(from), requested: countIn(requestedDates, from, to), drafted: countIn(draftedDates, from, to), signed: countIn(signedDates, from, to) }
    })
  }
  // custom
  const rangeDays = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
  if (rangeDays <= 14) {
    return Array.from({ length: rangeDays || 1 }, (_, i) => {
      const day = startOfDay(new Date(periodStart))
      day.setDate(day.getDate() + i)
      const next = new Date(day); next.setDate(next.getDate() + 1)
      return { label: dayLabel(day), requested: countIn(requestedDates, day, next), drafted: countIn(draftedDates, day, next), signed: countIn(signedDates, day, next) }
    })
  }
  if (rangeDays <= 90) {
    const weeks = Math.ceil(rangeDays / 7)
    return Array.from({ length: weeks }, (_, i) => {
      const weekStart = startOfDay(new Date(periodStart))
      weekStart.setDate(weekStart.getDate() + i * 7)
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7)
      return { label: dayLabel(weekStart), requested: countIn(requestedDates, weekStart, weekEnd), drafted: countIn(draftedDates, weekStart, weekEnd), signed: countIn(signedDates, weekStart, weekEnd) }
    })
  }
  const months: ElBucket[] = []
  const cursor = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1)
  while (cursor <= now) {
    const from = new Date(cursor)
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    months.push({ label: monthLabel(from), requested: countIn(requestedDates, from, to), drafted: countIn(draftedDates, from, to), signed: countIn(signedDates, from, to) })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return months
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string; from?: string; to?: string }>
}) {
  const [session, params] = await Promise.all([getServerSession(authOptions), searchParams])

  const period = (["7d", "30d", "90d", "year", "custom"].includes(params.period ?? "")
    ? params.period
    : "30d") as Period

  const now = params.to ? new Date(params.to) : new Date()
  const periodStart = getPeriodStart(period, now, params.from)

  const [
    rfqsReceived, quotesShared, rfqRaw, quoteRaw, avgDaysRaw,
    elRequested, elDrafted, elSigned, elRequestedRaw, elDraftedRaw, elSignedRaw, avgElDaysRaw,
  ] = await Promise.all([
    // Quote stats
    db.opportunity.count({ where: { rfqDate: { gte: periodStart, lte: now } } }),
    db.opportunity.count({ where: { quoteSentDate: { gte: periodStart, lte: now } } }),
    db.opportunity.findMany({ where: { rfqDate: { gte: periodStart, lte: now } }, select: { rfqDate: true } }),
    db.opportunity.findMany({ where: { quoteSentDate: { gte: periodStart, lte: now } }, select: { quoteSentDate: true } }),
    db.opportunity.findMany({
      where: { quoteSentDate: { gte: periodStart, lte: now }, rfqDate: { not: null } },
      select: { rfqDate: true, quoteSentDate: true },
    }),
    // EL stats
    db.opportunity.count({ where: { elRequestedDate: { gte: periodStart, lte: now } } }),
    db.opportunity.count({ where: { elDraftSharedDate: { gte: periodStart, lte: now } } }),
    db.opportunity.count({ where: { elSignedSharedDate: { gte: periodStart, lte: now } } }),
    db.opportunity.findMany({ where: { elRequestedDate: { gte: periodStart, lte: now } }, select: { elRequestedDate: true } }),
    db.opportunity.findMany({ where: { elDraftSharedDate: { gte: periodStart, lte: now } }, select: { elDraftSharedDate: true } }),
    db.opportunity.findMany({ where: { elSignedSharedDate: { gte: periodStart, lte: now } }, select: { elSignedSharedDate: true } }),
    db.opportunity.findMany({
      where: { elSignedSharedDate: { gte: periodStart, lte: now }, elRequestedDate: { not: null } },
      select: { elRequestedDate: true, elSignedSharedDate: true },
    }),
  ])

  const avgDaysToQuote =
    avgDaysRaw.length > 0
      ? Math.round(
          avgDaysRaw.reduce(
            (sum, o) => sum + (o.quoteSentDate!.getTime() - o.rfqDate!.getTime()) / (1000 * 60 * 60 * 24),
            0
          ) / avgDaysRaw.length
        )
      : null

  const avgDaysToElSigned =
    avgElDaysRaw.length > 0
      ? Math.round(
          avgElDaysRaw.reduce(
            (sum, o) => sum + (o.elSignedSharedDate!.getTime() - o.elRequestedDate!.getTime()) / (1000 * 60 * 60 * 24),
            0
          ) / avgElDaysRaw.length
        )
      : null

  const rfqDates = rfqRaw.map((r) => r.rfqDate).filter((d): d is Date => d !== null)
  const quoteDates = quoteRaw.map((r) => r.quoteSentDate).filter((d): d is Date => d !== null)
  const trendData = buildTrend(period, rfqDates, quoteDates, now, periodStart)

  const elRequestedDates = elRequestedRaw.map((r) => r.elRequestedDate).filter((d): d is Date => d !== null)
  const elDraftedDates = elDraftedRaw.map((r) => r.elDraftSharedDate).filter((d): d is Date => d !== null)
  const elSignedDates = elSignedRaw.map((r) => r.elSignedSharedDate).filter((d): d is Date => d !== null)
  const elTrendData = buildElTrend(period, elRequestedDates, elDraftedDates, elSignedDates, now, periodStart)

  const periodLabel =
    period === "year"
      ? "Jan 1 – today"
      : period === "custom" && params.from && params.to
      ? `${params.from} – ${params.to}`
      : `Last ${period === "7d" ? "7" : period === "30d" ? "30" : "90"} days`

  return (
    <div>
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Welcome back, {session?.user.name}</p>
        </div>
        <PeriodSelector current={period} currentFrom={params.from} currentTo={params.to} />
      </div>

      <p className="text-xs text-gray-400 mb-4">{periodLabel}</p>

      <div className="flex flex-col gap-6">
        {/* Quote Activity */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-6">Quote Activity</h2>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <KpiTile label="RFQs Received" value={rfqsReceived} color="text-[#006fff]" />
            <KpiTile label="Quotes Shared" value={quotesShared} color="text-emerald-500" />
            <KpiTile label="Avg Days to Quote" value={avgDaysToQuote ?? "—"} unit={avgDaysToQuote !== null ? "days" : ""} color="text-amber-500" />
          </div>

          <RfqTrendChart data={trendData} />
        </div>

        {/* EL Activity */}
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-6">EL Activity</h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
            <KpiTile label="ELs Requested" value={elRequested} color="text-[#006fff]" />
            <KpiTile label="EL Drafts Shared" value={elDrafted} color="text-amber-500" />
            <KpiTile label="EL Signed Shared" value={elSigned} color="text-emerald-500" />
            <KpiTile label="Avg Days to Signed" value={avgDaysToElSigned ?? "—"} unit={avgDaysToElSigned !== null ? "days" : ""} color="text-gray-500" />
          </div>

          <ElTrendChart data={elTrendData} />
        </div>
      </div>
    </div>
  )
}

// ─── KPI tile ─────────────────────────────────────────────────────────────────

function KpiTile({
  label,
  value,
  unit = "",
  color = "text-gray-900",
}: {
  label: string
  value: number | string
  unit?: string
  color?: string
}) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">{label}</p>
      <div className="flex items-baseline gap-1.5">
        <span className={`text-3xl font-bold ${color}`}>{value}</span>
        {unit && <span className="text-sm text-gray-400">{unit}</span>}
      </div>
    </div>
  )
}
