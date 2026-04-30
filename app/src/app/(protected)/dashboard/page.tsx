import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { PeriodSelector } from "@/components/dashboard/period-selector"
import { PipelineFlow } from "@/components/dashboard/pipeline-flow"
import { QuoteActivitySection, ElActivitySection, ProductionActivitySection } from "@/components/dashboard/activity-sections"
import { RecentActivity } from "@/components/dashboard/recent-activity"
import { PIPELINE_STATUSES } from "@/lib/utils"
import type { RfqTrendBucket, ElTrendBucket, ProdTrendBucket } from "@/components/dashboard/charts"

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

// ─── Generic bucket builder ───────────────────────────────────────────────────

function buildBuckets(period: Period, now: Date, periodStart: Date): { label: string; fromISO: string; toISO: string }[] {
  function startOfDay(d: Date): Date {
    const c = new Date(d); c.setHours(0, 0, 0, 0); return c
  }
  function dayLabel(d: Date): string {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })
  }
  function monthLabel(d: Date): string {
    return d.toLocaleDateString("en-GB", { month: "short" })
  }

  if (period === "7d") {
    return Array.from({ length: 7 }, (_, i) => {
      const day = startOfDay(new Date(now)); day.setDate(day.getDate() - (6 - i))
      const next = new Date(day); next.setDate(next.getDate() + 1)
      return { label: dayLabel(day), fromISO: day.toISOString(), toISO: next.toISOString() }
    })
  }
  if (period === "30d") {
    return Array.from({ length: 5 }, (_, i) => {
      const weekEnd = startOfDay(new Date(now)); weekEnd.setDate(weekEnd.getDate() - (4 - i) * 7)
      const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6)
      const next = new Date(weekEnd); next.setDate(next.getDate() + 1)
      return { label: dayLabel(weekStart), fromISO: weekStart.toISOString(), toISO: next.toISOString() }
    })
  }
  if (period === "90d") {
    return Array.from({ length: 13 }, (_, i) => {
      const weekEnd = startOfDay(new Date(now)); weekEnd.setDate(weekEnd.getDate() - (12 - i) * 7)
      const weekStart = new Date(weekEnd); weekStart.setDate(weekStart.getDate() - 6)
      const next = new Date(weekEnd); next.setDate(next.getDate() + 1)
      return { label: dayLabel(weekStart), fromISO: weekStart.toISOString(), toISO: next.toISOString() }
    })
  }
  if (period === "year") {
    return Array.from({ length: 12 }, (_, i) => {
      const month = now.getMonth() - 11 + i
      const year = now.getFullYear() + Math.floor(month / 12)
      const monthNorm = ((month % 12) + 12) % 12
      const from = new Date(year, monthNorm, 1)
      const to = new Date(year, monthNorm + 1, 1)
      return { label: monthLabel(from), fromISO: from.toISOString(), toISO: to.toISOString() }
    })
  }

  // custom
  const rangeDays = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24))
  if (rangeDays <= 14) {
    return Array.from({ length: rangeDays || 1 }, (_, i) => {
      const day = startOfDay(new Date(periodStart)); day.setDate(day.getDate() + i)
      const next = new Date(day); next.setDate(next.getDate() + 1)
      return { label: dayLabel(day), fromISO: day.toISOString(), toISO: next.toISOString() }
    })
  }
  if (rangeDays <= 90) {
    const weeks = Math.ceil(rangeDays / 7)
    return Array.from({ length: weeks }, (_, i) => {
      const weekStart = startOfDay(new Date(periodStart)); weekStart.setDate(weekStart.getDate() + i * 7)
      const weekEnd = new Date(weekStart); weekEnd.setDate(weekEnd.getDate() + 7)
      return { label: dayLabel(weekStart), fromISO: weekStart.toISOString(), toISO: weekEnd.toISOString() }
    })
  }
  const buckets: { label: string; fromISO: string; toISO: string }[] = []
  const cursor = new Date(periodStart.getFullYear(), periodStart.getMonth(), 1)
  while (cursor <= now) {
    const from = new Date(cursor)
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    buckets.push({ label: monthLabel(from), fromISO: from.toISOString(), toISO: to.toISOString() })
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return buckets
}

function count(dates: Date[], from: Date, to: Date): number {
  return dates.filter((d) => d >= from && d < to).length
}

function buildTrend(buckets: { label: string; fromISO: string; toISO: string }[], rfqDates: Date[], quoteDates: Date[]): RfqTrendBucket[] {
  return buckets.map(({ label, fromISO, toISO }) => {
    const from = new Date(fromISO), to = new Date(toISO)
    return { label, fromISO, toISO, rfq: count(rfqDates, from, to), quotes: count(quoteDates, from, to) }
  })
}

function buildElTrend(buckets: { label: string; fromISO: string; toISO: string }[], requestedDates: Date[], draftedDates: Date[], signedDates: Date[]): ElTrendBucket[] {
  return buckets.map(({ label, fromISO, toISO }) => {
    const from = new Date(fromISO), to = new Date(toISO)
    return { label, fromISO, toISO, requested: count(requestedDates, from, to), drafted: count(draftedDates, from, to), signed: count(signedDates, from, to) }
  })
}

function buildProdTrend(buckets: { label: string; fromISO: string; toISO: string }[], countersignedDates: Date[], advanceDates: Date[], fatDates: Date[], deliveredDates: Date[]): ProdTrendBucket[] {
  return buckets.map(({ label, fromISO, toISO }) => {
    const from = new Date(fromISO), to = new Date(toISO)
    return { label, fromISO, toISO, countersigned: count(countersignedDates, from, to), advancePaid: count(advanceDates, from, to), fatPassed: count(fatDates, from, to), delivered: count(deliveredDates, from, to) }
  })
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

  // Exclusive upper bound for KPI tile drill-downs (covers all of `now` day)
  const periodToISO = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
  const periodFromISO = periodStart.toISOString()

  const [periodData, pipelineCountRaw, recentRaw] = await Promise.all([
    Promise.all([
      // Quote date arrays
      db.opportunity.findMany({ where: { rfqDate: { gte: periodStart, lte: now } }, select: { rfqDate: true } }),
      db.opportunity.findMany({ where: { quoteSentDate: { gte: periodStart, lte: now } }, select: { quoteSentDate: true } }),
      db.opportunity.findMany({
        where: { quoteSentDate: { gte: periodStart, lte: now }, rfqDate: { not: null } },
        select: { rfqDate: true, quoteSentDate: true },
      }),
      // EL date arrays
      db.opportunity.findMany({ where: { elRequestedDate: { gte: periodStart, lte: now } }, select: { elRequestedDate: true } }),
      db.opportunity.findMany({ where: { elDraftSharedDate: { gte: periodStart, lte: now } }, select: { elDraftSharedDate: true } }),
      db.opportunity.findMany({ where: { elSignedSharedDate: { gte: periodStart, lte: now } }, select: { elSignedSharedDate: true } }),
      db.opportunity.findMany({
        where: { elSignedSharedDate: { gte: periodStart, lte: now }, elRequestedDate: { not: null } },
        select: { elRequestedDate: true, elSignedSharedDate: true },
      }),
      // Production date arrays
      db.opportunity.findMany({ where: { elCountersignedDate: { gte: periodStart, lte: now } }, select: { elCountersignedDate: true } }),
      db.opportunity.findMany({ where: { advancePaymentDate: { gte: periodStart, lte: now } }, select: { advancePaymentDate: true } }),
      db.opportunity.findMany({ where: { fatPassedDate: { gte: periodStart, lte: now } }, select: { fatPassedDate: true } }),
      db.opportunity.findMany({ where: { deliveredDate: { gte: periodStart, lte: now } }, select: { deliveredDate: true } }),
    ]),
    Promise.all(PIPELINE_STATUSES.map((s) => db.opportunity.count({ where: { status: s } }))),
    db.opportunity.findMany({
      select: { id: true, title: true, customer: true, internalId: true, status: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ])

  const [
    rfqRaw, quoteRaw, avgDaysRaw,
    elRequestedRaw, elDraftedRaw, elSignedRaw, avgElDaysRaw,
    countersignedRaw, advanceRaw, fatRaw, deliveredRaw,
  ] = periodData

  // KPI counts
  const rfqsReceived = rfqRaw.length
  const quotesShared = quoteRaw.length
  const elRequested = elRequestedRaw.length
  const elDrafted = elDraftedRaw.length
  const elSigned = elSignedRaw.length
  const countersigned = countersignedRaw.length
  const advancePaid = advanceRaw.length
  const fatPassed = fatRaw.length
  const delivered = deliveredRaw.length

  // Averages
  const avgDaysToQuote = avgDaysRaw.length > 0
    ? Math.round(avgDaysRaw.reduce((sum, o) => sum + (o.quoteSentDate!.getTime() - o.rfqDate!.getTime()) / 86400000, 0) / avgDaysRaw.length)
    : null

  const avgDaysToElSigned = avgElDaysRaw.length > 0
    ? Math.round(avgElDaysRaw.reduce((sum, o) => sum + (o.elSignedSharedDate!.getTime() - o.elRequestedDate!.getTime()) / 86400000, 0) / avgElDaysRaw.length)
    : null

  // Trend data
  const buckets = buildBuckets(period, now, periodStart)
  const rfqDates = rfqRaw.map((r) => r.rfqDate).filter((d): d is Date => d !== null)
  const quoteDates = quoteRaw.map((r) => r.quoteSentDate).filter((d): d is Date => d !== null)
  const trendData = buildTrend(buckets, rfqDates, quoteDates)

  const elRequestedDates = elRequestedRaw.map((r) => r.elRequestedDate).filter((d): d is Date => d !== null)
  const elDraftedDates = elDraftedRaw.map((r) => r.elDraftSharedDate).filter((d): d is Date => d !== null)
  const elSignedDates = elSignedRaw.map((r) => r.elSignedSharedDate).filter((d): d is Date => d !== null)
  const elTrendData = buildElTrend(buckets, elRequestedDates, elDraftedDates, elSignedDates)

  const countersignedDates = countersignedRaw.map((r) => r.elCountersignedDate).filter((d): d is Date => d !== null)
  const advanceDates = advanceRaw.map((r) => r.advancePaymentDate).filter((d): d is Date => d !== null)
  const fatDates = fatRaw.map((r) => r.fatPassedDate).filter((d): d is Date => d !== null)
  const deliveredDates = deliveredRaw.map((r) => r.deliveredDate).filter((d): d is Date => d !== null)
  const prodTrendData = buildProdTrend(buckets, countersignedDates, advanceDates, fatDates, deliveredDates)

  const statusCounts = Object.fromEntries(PIPELINE_STATUSES.map((s, i) => [s, pipelineCountRaw[i]]))
  const recentItems = recentRaw.map((r) => ({ ...r, updatedAt: r.updatedAt.toISOString() }))

  const periodLabel =
    period === "year"
      ? "Jan 1 – today"
      : period === "custom" && params.from && params.to
      ? `${params.from} – ${params.to}`
      : `Last ${period === "7d" ? "7" : period === "30d" ? "30" : "90"} days`

  const currentUserId = session!.user.id
  const isAdmin = session?.user.role === "ADMIN"

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {session?.user.name}</p>
      </div>

      {/* Pipeline — current state, not time-bound */}
      <PipelineFlow counts={statusCounts} currentUserId={currentUserId} isAdmin={isAdmin} />

      {/* Period selector — applies to activity graphs below */}
      <div className="flex items-center justify-between mb-4 mt-6">
        <p className="text-xs text-gray-400">{periodLabel}</p>
        <PeriodSelector current={period} currentFrom={params.from} currentTo={params.to} />
      </div>

      <div className="flex flex-col gap-6">
        <QuoteActivitySection
          kpiRfq={rfqsReceived} kpiQuotes={quotesShared} kpiAvgDays={avgDaysToQuote}
          trendData={trendData} periodFromISO={periodFromISO} periodToISO={periodToISO}
          currentUserId={currentUserId} isAdmin={isAdmin} />

        <ElActivitySection
          kpiRequested={elRequested} kpiDrafted={elDrafted} kpiSigned={elSigned} kpiAvgDays={avgDaysToElSigned}
          trendData={elTrendData} periodFromISO={periodFromISO} periodToISO={periodToISO}
          currentUserId={currentUserId} isAdmin={isAdmin} />

        <ProductionActivitySection
          kpiCountersigned={countersigned} kpiAdvance={advancePaid} kpiFat={fatPassed} kpiDelivered={delivered}
          trendData={prodTrendData} periodFromISO={periodFromISO} periodToISO={periodToISO}
          currentUserId={currentUserId} isAdmin={isAdmin} />

        <RecentActivity items={recentItems} currentUserId={currentUserId} isAdmin={isAdmin} />
      </div>
    </div>
  )
}
