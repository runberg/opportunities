import { Suspense } from "react"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { formatDate, parseParam, buildOpportunityWhere, EL_STATUSES, STATUS_GROUPS } from "@/lib/utils"
import { ELTable } from "@/components/opportunities/el-table"
import { FilterBar } from "@/components/opportunities/filter-bar"
import { Pagination } from "@/components/opportunities/pagination"

interface SearchParams {
  q?: string
  status?: string
  waitingOn?: string
  page?: string
  perPage?: string
}

export default async function ELsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const [params, session] = await Promise.all([searchParams, getServerSession(authOptions)])
  const query = params.q?.trim() ?? ""
  const selectedStatuses = params.status ? params.status.split(",").filter(Boolean) : []
  const perPage = parseParam(params.perPage, 50)
  const page = parseParam(params.page, 1)

  const where = buildOpportunityWhere(query, selectedStatuses, EL_STATUSES)
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
    title: opp.title,
    customer: opp.customer,
    reference: opp.reference,
    elRequestedDate: opp.elRequestedDate ? formatDate(opp.elRequestedDate) : null,
    product: opp.product,
    status: opp.status,
    _count: opp._count,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Engagement Letters</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} results</p>
        </div>
      </div>

      <Suspense fallback={<div className="h-12 bg-gray-50 rounded-lg animate-pulse mb-6" />}>
        <FilterBar basePath="/els" statusGroups={STATUS_GROUPS.filter((g) => g.label === "Engagement Letter")} exportType="els" />
      </Suspense>

      <ELTable
        opportunities={rows}
        currentUserId={session!.user.id}
        isAdmin={session?.user.role === "ADMIN"}
      />

      <Suspense>
        <Pagination total={total} page={page} perPage={perPage} basePath="/els" />
      </Suspense>
    </div>
  )
}
