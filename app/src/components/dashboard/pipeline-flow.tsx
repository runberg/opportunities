"use client"

import { useState, useEffect } from "react"
import { ChevronRight, X, Search, Download } from "lucide-react"
import { cn } from "@/lib/utils"
import { OpportunityModal } from "@/components/opportunities/opportunity-modal"
import { OpportunityDataTable, type OppTableRow, type DateColumn } from "@/components/opportunities/opportunity-data-table"
import { type SortDir } from "@/components/ui/sortable-header"

const STATUS_DATE_COLUMN: Record<string, DateColumn> = {
  RFQ_RECEIVED:             { label: "RFQ Date",             sortKey: "rfqDate",             getValue: (r) => r.rfqDate },
  QUOTE_SENT:               { label: "Quote Sent Date",       sortKey: "quoteSentDate",       getValue: (r) => r.quoteSentDate },
  EL_REQUEST_RECEIVED:      { label: "EL Request Date",       sortKey: "elRequestedDate",     getValue: (r) => r.elRequestedDate },
  EL_DRAFT_SHARED:          { label: "EL Draft Shared Date",  sortKey: "elDraftSharedDate",   getValue: (r) => r.elDraftSharedDate },
  EL_SIGNED_SHARED:         { label: "EL Signed Shared Date", sortKey: "elSignedSharedDate",  getValue: (r) => r.elSignedSharedDate },
  PENDING_ADVANCE_PAYMENT:  { label: "Countersigned Date",    sortKey: "elCountersignedDate", getValue: (r) => r.elCountersignedDate },
  IN_PRODUCTION:            { label: "Adv. Payment Date",     sortKey: "advancePaymentDate",  getValue: (r) => r.advancePaymentDate },
  DELIVERED:                { label: "Delivered Date",        sortKey: "deliveredDate",       getValue: (r) => r.deliveredDate },
}

// ─── Pipeline definition ──────────────────────────────────────────────────────

const PIPELINE_GROUPS = [
  {
    label: "Quote",
    accentClass: "bg-[#006fff]",
    countClass: "text-[#006fff]",
    steps: [
      { status: "RFQ_RECEIVED",  label: "RFQ Received" },
      { status: "QUOTE_SENT",    label: "Quote Sent"   },
    ],
  },
  {
    label: "Engagement Letter",
    accentClass: "bg-amber-400",
    countClass: "text-amber-600",
    steps: [
      { status: "EL_REQUEST_RECEIVED", label: "EL Requested"  },
      { status: "EL_DRAFT_SHARED",     label: "EL Draft"      },
      { status: "EL_SIGNED_SHARED",    label: "Signed Shared" },
    ],
  },
  {
    label: "Production",
    accentClass: "bg-green-500",
    countClass: "text-green-600",
    steps: [
      { status: "PENDING_ADVANCE_PAYMENT", label: "Adv. Payment"  },
      { status: "IN_PRODUCTION",           label: "In Production" },
      { status: "DELIVERED",               label: "Delivered"     },
    ],
  },
] as const

function exportTypeForStatus(status: string): string {
  if (["RFQ_RECEIVED", "QUOTE_SENT"].includes(status)) return "quotes"
  if (status.startsWith("EL_")) return "els"
  return "production"
}

// ─── Pipeline flow bar ────────────────────────────────────────────────────────

export function PipelineFlow({
  counts,
  currentUserId,
  isAdmin,
}: {
  counts: Record<string, number>
  currentUserId: string
  isAdmin: boolean
}) {
  const [activeStatus, setActiveStatus] = useState<string | null>(null)
  const [activeLabel, setActiveLabel] = useState("")

  function open(status: string, label: string) {
    setActiveStatus(status)
    setActiveLabel(label)
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 overflow-x-auto">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">Pipeline</p>
        <div className="flex items-stretch gap-3 min-w-max">
          {PIPELINE_GROUPS.map((group, gi) => (
            <div key={group.label} className="flex items-center gap-3">
              {gi > 0 && <ChevronRight size={20} className="text-gray-300 flex-shrink-0" />}
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <div className={cn("h-1", group.accentClass)} />
                <div className="px-4 pt-2.5 pb-4">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    {group.label}
                  </p>
                  <div className="flex items-center gap-1">
                    {group.steps.map((step, si) => {
                      const count = counts[step.status] ?? 0
                      return (
                        <div key={step.status} className="flex items-center gap-1">
                          {si > 0 && <ChevronRight size={12} className="text-gray-300 flex-shrink-0" />}
                            <button
                            type="button"
                            disabled={count === 0}
                            onClick={() => open(step.status, step.label)}
                            className={cn(
                              "flex flex-col items-center px-3 py-2 rounded-lg min-w-[76px] transition-colors",
                              count > 0 ? "hover:bg-gray-50 cursor-pointer" : "cursor-default"
                            )}
                          >
                            <span className="text-xs text-gray-500 whitespace-nowrap">{step.label}</span>
                            <span className={cn("text-3xl font-bold mt-1 tabular-nums", group.countClass)}>
                              {count}
                            </span>
                          </button>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {activeStatus && (
        <StatusDrillModal
          status={activeStatus}
          label={activeLabel}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={() => setActiveStatus(null)}
        />
      )}
    </>
  )
}

// ─── Drill-down modal ─────────────────────────────────────────────────────────

function StatusDrillModal({
  status, label, currentUserId, isAdmin, onClose,
}: {
  status: string
  label: string
  currentUserId: string
  isAdmin: boolean
  onClose: () => void
}) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  const [sortKey, setSortKey] = useState("title")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [result, setResult] = useState<{ items: OppTableRow[]; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  function handleSort(key: string, dir: SortDir) { setSortKey(key); setSortDir(dir); setPage(1) }

  // Debounce search + reset page
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(query); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [query])

  // Fetch
  useEffect(() => {
    setLoading(true)
    const sp = new URLSearchParams({ status, page: String(page), perPage: String(perPage), sortBy: sortKey, sortDir })
    if (debouncedQuery) sp.set("q", debouncedQuery)
    fetch(`/api/opportunities?${sp}`)
      .then((r) => r.json())
      .then((d) => { setResult(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [status, debouncedQuery, page, perPage, sortKey, sortDir])

  // Escape key
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && !openId) onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, openId])

  const items = result?.items ?? []
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const queryPart = debouncedQuery ? `&q=${encodeURIComponent(debouncedQuery)}` : ""
  const exportHref = `/api/export?type=${exportTypeForStatus(status)}&status=${status}${queryPart}`

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-[4vh]">
        <div className="fixed inset-0 bg-black/40" onClick={() => { if (!openId) onClose() }} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mb-8">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{label}</h2>
              <p className="text-sm text-gray-500 mt-0.5">{total} {total === 1 ? "opportunity" : "opportunities"}</p>
            </div>
            <button type="button" onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={17} />
            </button>
          </div>

          {/* Search + export */}
          <div className="flex items-center gap-3 px-6 py-3 border-b border-gray-100">
            <div className="flex-1 relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, customer, ID, reference…"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <a
              href={exportHref}
              download
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg text-sm transition-colors whitespace-nowrap"
            >
              <Download size={14} />
              Export CSV
            </a>
          </div>

          {/* Table */}
          <OpportunityDataTable
            variant="modal"
            rows={items}
            emptyMessage="No opportunities found."
            loading={loading}
            sortKey={sortKey}
            sortDir={sortDir}
            onSort={handleSort}
            dateColumn={STATUS_DATE_COLUMN[status]}
            onRowClick={setOpenId}
          />

          {/* Pagination */}
          {total > perPage && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Rows per page:</span>
                <select
                  value={perPage}
                  onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
                  className="border border-gray-300 rounded px-1 py-0.5 focus:outline-none"
                >
                  {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="ml-2">
                  {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors">
                  ← Prev
                </button>
                <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
                <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}
                  className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors">
                  Next →
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {openId && (
        <OpportunityModal
          opportunityId={openId}
          onClose={() => setOpenId(null)}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
        />
      )}
    </div>
  )
}
