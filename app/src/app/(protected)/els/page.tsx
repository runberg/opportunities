import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { formatDate, EL_STATUSES } from "@/lib/utils"
import { ELTable } from "@/components/opportunities/el-table"
import { FilterBar } from "@/components/opportunities/filter-bar"

const ALL_EL_STATUSES = [...EL_STATUSES, "EL_FULLY_SIGNED"] as const

interface SearchParams {
  q?: string
  status?: string
  waitingOn?: string
}

export default async function ELsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const [params, session] = await Promise.all([searchParams, getServerSession(authOptions)])
  const query = params.q?.trim() ?? ""
  const selectedStatuses = params.status ? params.status.split(",").filter(Boolean) : []
  const selectedPending = params.waitingOn ? params.waitingOn.split(",").filter(Boolean) : []

  const opportunities = await db.opportunity.findMany({
    where: {
      AND: [
        { status: { in: (selectedStatuses.length > 0 ? selectedStatuses : ALL_EL_STATUSES) as never[] } },
        selectedPending.length > 0 ? { waitingOn: { in: selectedPending as never[] } } : {},
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
      ],
    },
    include: {
      _count: { select: { comments: true, documents: true } },
    },
    orderBy: { updatedAt: "desc" },
  })

  const rows = opportunities.map((opp) => ({
    id: opp.id,
    internalId: opp.internalId,
    title: opp.title,
    customer: opp.customer,
    reference: opp.reference,
    elRequestedDate: opp.elRequestedDate ? formatDate(opp.elRequestedDate) : null,
    product: opp.product,
    status: opp.status,
    waitingOn: opp.waitingOn,
    _count: opp._count,
  }))

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Engagement Letters</h1>
          <p className="text-sm text-gray-500 mt-0.5">{opportunities.length} results</p>
        </div>
      </div>

      <FilterBar basePath="/els" />

      <ELTable
        opportunities={rows}
        currentUserId={session!.user.id}
        isAdmin={session?.user.role === "ADMIN"}
      />
    </div>
  )
}
