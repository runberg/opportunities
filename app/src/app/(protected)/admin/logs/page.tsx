import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SystemLogClient } from "./client"

const PAGE_SIZE = 100

export default async function SystemLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; type?: string }>
}) {
  const [session, params] = await Promise.all([getServerSession(authOptions), searchParams])
  if (session?.user.role !== "ADMIN") redirect("/dashboard")

  const page = Math.max(1, parseInt(params.page ?? "1") || 1)
  const typeFilter = params.type ?? ""

  const where = typeFilter ? { type: typeFilter as never } : {}

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
      />
    </div>
  )
}
