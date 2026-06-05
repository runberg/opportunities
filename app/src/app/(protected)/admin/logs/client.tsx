"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { OpportunityModal } from "@/components/opportunities/opportunity-modal"

type LogType = "LOGIN" | "PASSWORD_CHANGED" | "OPPORTUNITY_CREATED" | "OPPORTUNITY_UPDATED" | "USER_CREATED" | "USER_UPDATED" | "SMTP_UPDATED"

interface LogEntry {
  id: string
  type: LogType
  message: string
  createdAt: string
  userId: string | null
  opportunityId: string | null
  user: { name: string } | null
  opportunity: { title: string } | null
}

const TYPE_LABELS: Record<LogType, string> = {
  LOGIN: "Login",
  PASSWORD_CHANGED: "Password",
  OPPORTUNITY_CREATED: "Opp. Created",
  OPPORTUNITY_UPDATED: "Opp. Updated",
  USER_CREATED: "User Created",
  USER_UPDATED: "User Updated",
  SMTP_UPDATED: "SMTP Config",
}

const TYPE_COLORS: Record<LogType, string> = {
  LOGIN: "bg-blue-50 text-blue-700 border-blue-200",
  PASSWORD_CHANGED: "bg-amber-50 text-amber-700 border-amber-200",
  OPPORTUNITY_CREATED: "bg-green-50 text-green-700 border-green-200",
  OPPORTUNITY_UPDATED: "bg-gray-100 text-gray-700 border-gray-200",
  USER_CREATED: "bg-purple-50 text-purple-700 border-purple-200",
  USER_UPDATED: "bg-purple-50 text-purple-700 border-purple-200",
  SMTP_UPDATED: "bg-teal-50 text-teal-700 border-teal-200",
}

const ALL_TYPES: LogType[] = ["LOGIN", "PASSWORD_CHANGED", "OPPORTUNITY_CREATED", "OPPORTUNITY_UPDATED", "USER_CREATED", "USER_UPDATED", "SMTP_UPDATED"]

function formatTimestamp(iso: string) {
  const d = new Date(iso)
  return d.toLocaleString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
    hour12: false,
  })
}

export function SystemLogClient({
  logs,
  total,
  page,
  pageSize,
  typeFilter,
  currentUserId,
}: {
  logs: LogEntry[]
  total: number
  page: number
  pageSize: number
  typeFilter: string
  currentUserId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [openId, setOpenId] = useState<string | null>(null)

  const totalPages = Math.ceil(total / pageSize)

  function navigate(newPage: number, newType?: string) {
    const p = new URLSearchParams()
    const t = newType !== undefined ? newType : typeFilter
    if (newPage > 1) p.set("page", String(newPage))
    if (t) p.set("type", t)
    const qs = p.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  return (
    <>
      {/* Type filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => navigate(1, "")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            !typeFilter ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
          )}
        >
          All
        </button>
        {ALL_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => navigate(1, t)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              typeFilter === t
                ? cn(TYPE_COLORS[t], "font-semibold")
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            )}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 whitespace-nowrap">Time</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Type</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500">Message</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 hidden sm:table-cell">User</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-gray-400">No log entries.</td>
              </tr>
            )}
            {logs.map((log) => {
              const isOpp = log.opportunityId !== null
              return (
                <tr
                  key={log.id}
                  onClick={isOpp ? () => setOpenId(log.opportunityId) : undefined}
                  className={cn(
                    "transition-colors",
                    isOpp && "cursor-pointer hover:bg-gray-50"
                  )}
                >
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap font-mono">
                    {formatTimestamp(log.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-block px-2 py-0.5 rounded text-xs font-medium border", TYPE_COLORS[log.type])}>
                      {TYPE_LABELS[log.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {log.message}
                    {isOpp && (
                      <span className="ml-1.5 text-xs text-[#006fff] hover:underline">open ↗</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                    {log.user?.name ?? <span className="text-gray-300">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => navigate(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => navigate(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-xs font-medium hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <OpportunityModal
        opportunityId={openId}
        onClose={() => { setOpenId(null); router.refresh() }}
        currentUserId={currentUserId}
        isAdmin={true}
      />
    </>
  )
}
