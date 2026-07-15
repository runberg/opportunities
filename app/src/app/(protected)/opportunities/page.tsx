import { Suspense } from "react"
import { db } from "@/shared/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import { formatDate, parseParam, buildOpportunityWhere, QUOTE_STATUSES, STATUS_GROUPS } from "@/shared/lib/utils"
import { FilterBar } from "@/modules/opportunities/components/filter-bar"
import { OpportunitiesTable } from "@/modules/opportunities/components/table"
import { Pagination } from "@/modules/opportunities/components/pagination"

interface SearchParams {
  q?: string
  status?: string
  waitingOn?: string
  page?: string
  perPage?: string
}

export default async function OpportunitiesPage({
  searchParams,
}: {
  readonly searchParams: Promise<SearchParams>
}) {
  const [params, session] = await Promise.all([searchParams, getServerSession(authOptions)])
  const query = params.q?.trim() ?? ""
  const selectedStatuses = params.status ? params.status.split(",").filter(Boolean) : []
  const perPage = parseParam(params.perPage, 50)
  const page = parseParam(params.page, 1)

  const where = buildOpportunityWhere(query, selectedStatuses, QUOTE_STATUSES)
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
    rfqDate: opp.rfqDate ? formatDate(opp.rfqDate) : null,
    quoteSentDate: opp.quoteSentDate ? formatDate(opp.quoteSentDate) : null,
    product: opp.product,
    status: opp.status,
    _count: opp._count,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Quotes</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} results</p>
        </div>
      </div>

      <Suspense fallback={<div className="h-12 bg-gray-50 rounded-lg animate-pulse mb-6" />}>
        <FilterBar statusGroups={STATUS_GROUPS.filter((g) => g.label === "Quote")} exportType="quotes" />
      </Suspense>

      <OpportunitiesTable
        opportunities={rows}
        currentUserId={session!.user.id}
        isAdmin={session?.user.role === "ADMIN"}
      />

      <Suspense>
        <Pagination total={total} page={page} perPage={perPage} basePath="/opportunities" />
      </Suspense>
    </div>
  )
}
