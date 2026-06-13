import { db } from "@/shared/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import { redirect } from "next/navigation"
import { SystemLogType } from "@prisma/client"
import { SystemLogClient } from "@/modules/admin/components/logs-client"

const PAGE_SIZE = 100

const GROUP_TYPES: Record<string, SystemLogType[]> = {
  OPPORTUNITIES: ["OPPORTUNITY_CREATED", "OPPORTUNITY_UPDATED"],
  ADHOC: [
    "ADHOC_AGREEMENT_CREATED", "ADHOC_AGREEMENT_UPDATED", "ADHOC_AGREEMENT_SIGNED",
    "ADHOC_AGREEMENT_DOCUMENT_UPLOADED", "ADHOC_AGREEMENT_DOCUMENT_DELETED",
    "ADHOC_DELIVERABLE_CREATED", "ADHOC_DELIVERABLE_UPDATED",
    "ADHOC_LINE_ITEM_ADDED", "ADHOC_LINE_ITEM_UPDATED", "ADHOC_LINE_ITEM_DELETED",
    "ADHOC_DOCUMENT_UPLOADED", "ADHOC_DOCUMENT_DELETED",
  ],
  USERS: ["USER_CREATED", "USER_UPDATED", "PASSWORD_CHANGED"],
  LOGIN: ["LOGIN"],
  CONFIG: ["SMTP_UPDATED"],
}

function buildWhere(typeFilter: string) {
  if (!typeFilter) return {}
  const group = GROUP_TYPES[typeFilter]
  if (group) return { type: { in: group } }
  return {}
}

export default async function SystemLogPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ page?: string; type?: string }>
}) {
  const [session, params] = await Promise.all([getServerSession(authOptions), searchParams])
  if (session?.user.role !== "ADMIN") redirect("/dashboard")

  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1)
  const typeFilter = params.type ?? ""
  const where = buildWhere(typeFilter)

  const [logs, total] = await Promise.all([
    db.systemLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        type: true,
        message: true,
        createdAt: true,
        userId: true,
        opportunityId: true,
        adhocDeliverableId: true,
        user: { select: { name: true } },
        opportunity: { select: { title: true } },
      },
    }),
    db.systemLog.count({ where }),
  ])

  const serialized = logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }))

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">System Log</h1>
        <p className="text-sm text-gray-500 mt-0.5">{total} entries</p>
      </div>
      <SystemLogClient
        logs={serialized}
        total={total}
        page={page}
        pageSize={PAGE_SIZE}
        typeFilter={typeFilter}
        currentUserId={session?.user.id ?? ""}
      />
    </div>
  )
}
