"use client"

import { useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { cn } from "@/shared/lib/utils"
import { OpportunityModal } from "@/modules/opportunities/components/opportunity-modal"

type LogType =
  | "LOGIN"
  | "PASSWORD_CHANGED"
  | "OPPORTUNITY_CREATED"
  | "OPPORTUNITY_UPDATED"
  | "USER_CREATED"
  | "USER_UPDATED"
  | "SMTP_UPDATED"
  | "ADHOC_AGREEMENT_CREATED"
  | "ADHOC_AGREEMENT_UPDATED"
  | "ADHOC_AGREEMENT_SIGNED"
  | "ADHOC_AGREEMENT_DOCUMENT_UPLOADED"
  | "ADHOC_AGREEMENT_DOCUMENT_DELETED"
  | "ADHOC_DELIVERABLE_CREATED"
  | "ADHOC_DELIVERABLE_UPDATED"
  | "ADHOC_LINE_ITEM_ADDED"
  | "ADHOC_LINE_ITEM_UPDATED"
  | "ADHOC_LINE_ITEM_DELETED"
  | "ADHOC_DOCUMENT_UPLOADED"
  | "ADHOC_DOCUMENT_DELETED"

interface LogEntry {
  readonly id: string
  readonly type: LogType
  readonly message: string
  readonly createdAt: string
  readonly userId: string | null
  readonly opportunityId: string | null
  readonly adhocDeliverableId: string | null
  readonly user: { readonly name: string } | null
  readonly opportunity: { readonly title: string } | null
}

const TYPE_LABELS: Record<LogType, string> = {
  LOGIN: "Login",
  PASSWORD_CHANGED: "Password",
  OPPORTUNITY_CREATED: "Opp. Created",
  OPPORTUNITY_UPDATED: "Opp. Updated",
  USER_CREATED: "User Created",
  USER_UPDATED: "User Updated",
  SMTP_UPDATED: "SMTP Config",
  ADHOC_AGREEMENT_CREATED: "Agreement",
  ADHOC_AGREEMENT_UPDATED: "Agreement",
  ADHOC_AGREEMENT_SIGNED: "Agreement",
  ADHOC_AGREEMENT_DOCUMENT_UPLOADED: "Agr. Doc",
  ADHOC_AGREEMENT_DOCUMENT_DELETED: "Agr. Doc",
  ADHOC_DELIVERABLE_CREATED: "Ad Hoc",
  ADHOC_DELIVERABLE_UPDATED: "Ad Hoc",
  ADHOC_LINE_ITEM_ADDED: "Ad Hoc",
  ADHOC_LINE_ITEM_UPDATED: "Ad Hoc",
  ADHOC_LINE_ITEM_DELETED: "Ad Hoc",
  ADHOC_DOCUMENT_UPLOADED: "Ad Hoc Doc",
  ADHOC_DOCUMENT_DELETED: "Ad Hoc Doc",
}

const ADHOC_COLOR = "bg-orange-50 text-orange-700 border-orange-200"

const TYPE_COLORS: Record<LogType, string> = {
  LOGIN: "bg-blue-50 text-blue-700 border-blue-200",
  PASSWORD_CHANGED: "bg-amber-50 text-amber-700 border-amber-200",
  OPPORTUNITY_CREATED: "bg-green-50 text-green-700 border-green-200",
  OPPORTUNITY_UPDATED: "bg-gray-100 text-gray-700 border-gray-200",
  USER_CREATED: "bg-purple-50 text-purple-700 border-purple-200",
  USER_UPDATED: "bg-purple-50 text-purple-700 border-purple-200",
  SMTP_UPDATED: "bg-teal-50 text-teal-700 border-teal-200",
  ADHOC_AGREEMENT_CREATED: ADHOC_COLOR,
  ADHOC_AGREEMENT_UPDATED: ADHOC_COLOR,
  ADHOC_AGREEMENT_SIGNED: ADHOC_COLOR,
  ADHOC_AGREEMENT_DOCUMENT_UPLOADED: ADHOC_COLOR,
  ADHOC_AGREEMENT_DOCUMENT_DELETED: ADHOC_COLOR,
  ADHOC_DELIVERABLE_CREATED: ADHOC_COLOR,
  ADHOC_DELIVERABLE_UPDATED: ADHOC_COLOR,
  ADHOC_LINE_ITEM_ADDED: ADHOC_COLOR,
  ADHOC_LINE_ITEM_UPDATED: ADHOC_COLOR,
  ADHOC_LINE_ITEM_DELETED: ADHOC_COLOR,
  ADHOC_DOCUMENT_UPLOADED: ADHOC_COLOR,
  ADHOC_DOCUMENT_DELETED: ADHOC_COLOR,
}

// Filter groups shown in the UI
const FILTER_GROUPS = [
  { label: "Opportunities", types: ["OPPORTUNITY_CREATED", "OPPORTUNITY_UPDATED"] as LogType[] },
  { label: "Ad Hoc", types: ["ADHOC_AGREEMENT_CREATED", "ADHOC_AGREEMENT_UPDATED", "ADHOC_AGREEMENT_SIGNED", "ADHOC_AGREEMENT_DOCUMENT_UPLOADED", "ADHOC_AGREEMENT_DOCUMENT_DELETED", "ADHOC_DELIVERABLE_CREATED", "ADHOC_DELIVERABLE_UPDATED", "ADHOC_LINE_ITEM_ADDED", "ADHOC_LINE_ITEM_UPDATED", "ADHOC_LINE_ITEM_DELETED", "ADHOC_DOCUMENT_UPLOADED", "ADHOC_DOCUMENT_DELETED"] as LogType[] },
  { label: "Users", types: ["USER_CREATED", "USER_UPDATED", "PASSWORD_CHANGED"] as LogType[] },
  { label: "Login", types: ["LOGIN"] as LogType[] },
  { label: "Config", types: ["SMTP_UPDATED"] as LogType[] },
]

// URL filter values for group filters
const GROUP_FILTER_VALUES: Record<string, string> = {
  Opportunities: "OPPORTUNITIES",
  "Ad Hoc": "ADHOC",
  Users: "USERS",
  Login: "LOGIN",
  Config: "CONFIG",
}

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
  readonly logs: LogEntry[]
  readonly total: number
  readonly page: number
  readonly pageSize: number
  readonly typeFilter: string
  readonly currentUserId: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [openId, setOpenId] = useState<string | null>(null)

  const totalPages = Math.ceil(total / pageSize)

  function navigate(newPage: number, newType?: string) {
    const p = new URLSearchParams()
    const t = newType ?? typeFilter
    if (newPage > 1) p.set("page", String(newPage))
    if (t) p.set("type", t)
    const qs = p.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }

  // Determine active group label for highlighting
  const activeGroup = FILTER_GROUPS.find(
    (g) => GROUP_FILTER_VALUES[g.label] === typeFilter
  )?.label ?? null

  return (
    <>
      {/* Type filter */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => navigate(1, "")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
            typeFilter
              ? "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
              : "bg-gray-900 text-white border-gray-900"
          )}
        >
          All
        </button>
        {FILTER_GROUPS.map((g) => (
          <button
            key={g.label}
            onClick={() => navigate(1, GROUP_FILTER_VALUES[g.label])}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors",
              activeGroup === g.label
                ? cn(TYPE_COLORS[g.types[0]], "font-semibold")
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"
            )}
          >
            {g.label}
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
