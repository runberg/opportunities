import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { formatDate, STATUS_LABELS } from "@/lib/utils"
import { StatusBadge } from "@/components/opportunities/status-badge"
import { Card, CardHeader, CardTitle } from "@/components/ui/card"
import { PipelineBarChart, WaitingOnPieChart } from "@/components/dashboard/charts"
import Link from "next/link"
import { Briefcase, CheckCircle, XCircle, Clock } from "lucide-react"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  const [
    activeCount,
    deliveredCount,
    cancelledCount,
    pendingCustomerCount,
    byStatus,
    byWaitingOn,
    recent,
  ] = await Promise.all([
    db.opportunity.count({
      where: { status: { notIn: ["DELIVERED", "CANCELLED"] } },
    }),
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
  ])

  const statusData = byStatus.map((s) => ({
    status: s.status,
    count: s._count.id,
  }))

  const waitingData = byWaitingOn.map((w) => ({
    waitingOn: w.waitingOn,
    count: w._count.id,
  }))

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Welcome back, {session?.user.name}</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
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

      {/* Recent Activity */}
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
                <th className="text-left pb-2 text-xs font-semibold text-gray-400 hidden sm:table-cell">Customer</th>
                <th className="text-left pb-2 text-xs font-semibold text-gray-400">Status</th>
                <th className="text-left pb-2 text-xs font-semibold text-gray-400 hidden lg:table-cell">Updated</th>
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
