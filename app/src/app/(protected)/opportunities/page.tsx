import { Suspense } from "react"
import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { formatDate, QUOTE_STATUSES, STATUS_GROUPS } from "@/lib/utils"
import { FilterBar } from "@/components/opportunities/filter-bar"
import { OpportunitiesTable } from "@/components/opportunities/table"
import { Pagination } from "@/components/opportunities/pagination"

function parseParam(val: string | undefined, fallback: number) {
  const n = val ? parseInt(val, 10) : NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

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
  searchParams: Promise<SearchParams>
}) {
  const [params, session] = await Promise.all([searchParams, getServerSession(authOptions)])
  const query = params.q?.trim() ?? ""
  const selectedStatuses = params.status ? params.status.split(",").filter(Boolean) : []
  const perPage = parseParam(params.perPage, 50)
  const page = parseParam(params.page, 1)

  const [opportunities, total] = await Promise.all([
    db.opportunity.findMany({
      where: {
        AND: [
          query
            ? {
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { customer: { contains: query, mode: "insensitive" } },
                  { reference: { contains: query, mode: "insensitive" } },
                  { internalId: { contains: query, mode: "insensitive" } },
                  { product: { contains: query, mode: "insensitive" } },
                ],
              }
            : {},
          selectedStatuses.length > 0
            ? { status: { in: selectedStatuses as never[] } }
            : { status: { in: QUOTE_STATUSES as unknown as never[] } },
        ],
      },
      include: { _count: { select: { comments: true, documents: true } } },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.opportunity.count({
      where: {
        AND: [
          query
            ? {
                OR: [
                  { title: { contains: query, mode: "insensitive" } },
                  { customer: { contains: query, mode: "insensitive" } },
                  { reference: { contains: query, mode: "insensitive" } },
                  { internalId: { contains: query, mode: "insensitive" } },
                  { product: { contains: query, mode: "insensitive" } },
                ],
              }
            : {},
          selectedStatuses.length > 0
            ? { status: { in: selectedStatuses as never[] } }
            : { status: { in: QUOTE_STATUSES as unknown as never[] } },
        ],
      },
    }),
  ])

  const rows = opportunities.map((opp) => ({
    id: opp.id,
    internalId: opp.internalId,
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
