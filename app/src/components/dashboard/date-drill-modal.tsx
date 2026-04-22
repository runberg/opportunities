"use client"

import { useState, useEffect } from "react"
import { X, Search } from "lucide-react"
import { OpportunityModal } from "@/components/opportunities/opportunity-modal"
import { OpportunityDataTable, type OppTableRow, type DateColumn } from "@/components/opportunities/opportunity-data-table"
import { type SortDir } from "@/components/ui/sortable-header"

const DATE_COLUMNS: Record<string, DateColumn> = {
  rfqDate:            { label: "RFQ Date",        sortKey: "rfqDate",            getValue: (r) => r.rfqDate },
  quoteSentDate:      { label: "Quote Shared",     sortKey: "quoteSentDate",      getValue: (r) => r.quoteSentDate },
  elRequestedDate:    { label: "EL Requested",     sortKey: "elRequestedDate",    getValue: (r) => r.elRequestedDate },
  elDraftSharedDate:  { label: "EL Draft Shared",  sortKey: "elDraftSharedDate",  getValue: (r) => r.elDraftSharedDate },
  elSignedSharedDate: { label: "EL Signed Shared", sortKey: "elSignedSharedDate", getValue: (r) => r.elSignedSharedDate },
  elCountersignedDate:{ label: "EL Countersigned", sortKey: "elCountersignedDate",getValue: (r) => r.elCountersignedDate },
  advancePaymentDate: { label: "Advance Payment",  sortKey: "advancePaymentDate", getValue: (r) => r.advancePaymentDate },
  fatPassedDate:      { label: "FAT Passed",       sortKey: "fatPassedDate",      getValue: (r) => r.fatPassedDate },
  satPassedDate:      { label: "SAT Passed",       sortKey: "satPassedDate",      getValue: (r) => r.satPassedDate },
  deliveredDate:      { label: "Delivered",        sortKey: "deliveredDate",      getValue: (r) => r.deliveredDate },
}

export function DateDrillModal({
  title, dateField, fromISO, toISO,
  currentUserId, isAdmin, onClose,
}: {
  title: string
  dateField: string
  fromISO: string
  toISO: string
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

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(query); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    setLoading(true)
    const sp = new URLSearchParams({
      dateField, dateFrom: fromISO, dateTo: toISO,
      page: String(page), perPage: String(perPage),
      sortBy: sortKey, sortDir,
    })
    if (debouncedQuery) sp.set("q", debouncedQuery)
    fetch(`/api/opportunities?${sp}`)
      .then((r) => r.json())
      .then((d) => { setResult(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [dateField, fromISO, toISO, debouncedQuery, page, perPage, sortKey, sortDir])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && !openId) onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, openId])

  const items = result?.items ?? []
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-[4vh]">
        <div className="fixed inset-0 bg-black/40" onClick={() => { if (!openId) onClose() }} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-4xl mb-8">

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-500 mt-0.5">
                {total} {total === 1 ? "opportunity" : "opportunities"} — current status shown
              </p>
            </div>
            <button type="button" onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={17} />
            </button>
          </div>

          {/* Search */}
          <div className="px-6 py-3 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, customer, ID, reference…"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
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
            dateColumn={DATE_COLUMNS[dateField]}
            onRowClick={setOpenId}
          />

          {/* Pagination */}
          {total > perPage && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>Rows per page:</span>
                <select value={perPage} onChange={(e) => { setPerPage(Number(e.target.value)); setPage(1) }}
                  className="border border-gray-300 rounded px-1 py-0.5 focus:outline-none">
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
