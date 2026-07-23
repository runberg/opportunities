import { Suspense } from "react"
import { db } from "@/shared/lib/db"
import { requireSectionAccess } from "@/shared/lib/page-access"
import { formatDate, parseParam, buildOpportunityWhere, PRODUCTION_STATUSES, STATUS_GROUPS } from "@/shared/lib/utils"
import { FilterBar } from "@/modules/opportunities/components/filter-bar"
import { ProductionTable } from "@/modules/opportunities/components/production-table"
import { Pagination } from "@/modules/opportunities/components/pagination"

interface SearchParams {
  readonly q?: string
  readonly status?: string
  readonly waitingOn?: string
  readonly page?: string
  readonly perPage?: string
}

export default async function ProductionPage({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>
}) {
  const [params, { session, isAdmin, isReadOnly }] = await Promise.all([
    searchParams,
    requireSectionAccess("opportunities"),
  ])

  const query = params.q?.trim() ?? ""
  const selectedStatuses = params.status ? params.status.split(",").filter(Boolean) : []
  const perPage = parseParam(params.perPage, 50)
  const page = parseParam(params.page, 1)

  const where = buildOpportunityWhere(query, selectedStatuses, PRODUCTION_STATUSES)
  const [opportunities, total] = await Promise.all([
    db.opportunity.findMany({
      where,
      include: { _count: { select: { comments: true, documents: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.opportunity.count({ where }),
  ])

  const rows = opportunities.map((opp) => ({
    id: opp.id,
    internalId: opp.internalId,
    createdAt: opp.createdAt.toISOString(),
    title: opp.title,
    customer: opp.customer,
    reference: opp.reference,
    product: opp.product,
    status: opp.status,
    advancePaymentDate: opp.advancePaymentDate ? formatDate(opp.advancePaymentDate) : null,
    fatPassedDate: opp.fatPassedDate ? formatDate(opp.fatPassedDate) : null,
    satApplicable: opp.satApplicable,
    satPassedDate: opp.satPassedDate ? formatDate(opp.satPassedDate) : null,
    deliveredDate: opp.deliveredDate ? formatDate(opp.deliveredDate) : null,
    _count: opp._count,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Production</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} results</p>
        </div>
      </div>

      <Suspense fallback={<div className="h-12 bg-gray-50 rounded-lg animate-pulse mb-6" />}>
        <FilterBar
          basePath="/production"
          statusGroups={STATUS_GROUPS.filter((g) => g.label === "Production")}
          exportType="production"
        />
      </Suspense>

      <ProductionTable
        opportunities={rows}
        currentUserId={session.user.id}
        isAdmin={isAdmin}
        isReadOnly={isReadOnly}
      />

      <Suspense>
        <Pagination total={total} page={page} perPage={perPage} basePath="/production" />
      </Suspense>
    </div>
  )
}
