"use client"

import { useState, useEffect } from "react"
import { X, Search, MessageSquarePlus } from "lucide-react"
import { OpportunityModal } from "@/modules/opportunities/components/opportunity-modal"
import { OpportunityDataTable, type DateColumn, type OppTableRow } from "@/modules/opportunities/components/opportunity-data-table"
import { CommentDialog } from "@/modules/opportunities/components/comment-dialog"
import { useDrillState, ModalPagination } from "./drill-shared"

const DATE_COLUMNS: Record<string, DateColumn> = {
  rfqDate:             { label: "RFQ Date",         sortKey: "rfqDate",             getValue: (r) => r.rfqDate },
  quoteSentDate:       { label: "Quote Shared",      sortKey: "quoteSentDate",       getValue: (r) => r.quoteSentDate },
  elRequestedDate:     { label: "EL Requested",      sortKey: "elRequestedDate",     getValue: (r) => r.elRequestedDate },
  elDraftSharedDate:   { label: "EL Draft Shared",   sortKey: "elDraftSharedDate",   getValue: (r) => r.elDraftSharedDate },
  elSignedSharedDate:  { label: "EL Signed Shared",  sortKey: "elSignedSharedDate",  getValue: (r) => r.elSignedSharedDate },
  elCountersignedDate: { label: "EL Countersigned",  sortKey: "elCountersignedDate", getValue: (r) => r.elCountersignedDate },
  advancePaymentDate:  { label: "Advance Payment",   sortKey: "advancePaymentDate",  getValue: (r) => r.advancePaymentDate },
  fatPassedDate:       { label: "FAT Passed",        sortKey: "fatPassedDate",       getValue: (r) => r.fatPassedDate },
  satPassedDate:       { label: "SAT Passed",        sortKey: "satPassedDate",       getValue: (r) => r.satPassedDate },
  deliveredDate:       { label: "Delivered",         sortKey: "deliveredDate",       getValue: (r) => r.deliveredDate },
}

export function DateDrillModal({
  title, dateField, fromISO, toISO,
  currentUserId, isAdmin, isReadOnly = false, onClose,
}: {
  readonly title: string
  readonly dateField: string
  readonly fromISO: string
  readonly toISO: string
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly isReadOnly?: boolean
  readonly onClose: () => void
}) {
  const [commentTarget, setCommentTarget] = useState<OppTableRow | null>(null)
  const {
    query, setQuery, debouncedQuery,
    page, setPage, perPage, setPerPage,
    sortKey, sortDir, handleSort,
    loading, setLoading, setResult,
    openId, setOpenId,
    items, total, totalPages,
  } = useDrillState(onClose)

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
  }, [dateField, fromISO, toISO, debouncedQuery, page, perPage, sortKey, sortDir, setLoading, setResult])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-[4vh]">
        <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 cursor-default" onClick={() => { if (!openId) onClose() }} />
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
            renderAction={isReadOnly ? undefined : (row) => (
              <button
                type="button"
                onClick={() => setCommentTarget(row)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                title="Add comment"
              >
                <MessageSquarePlus size={16} />
              </button>
            )}
          />

          <ModalPagination
            total={total} perPage={perPage} page={page} totalPages={totalPages}
            onPageChange={setPage} onPerPageChange={setPerPage}
          />
        </div>
      </div>

      {openId && (
        <OpportunityModal
          opportunityId={openId}
          onClose={() => setOpenId(null)}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isReadOnly={isReadOnly}
        />
      )}

      <CommentDialog
        target={commentTarget}
        commentEndpoint={commentTarget ? `/api/opportunities/${commentTarget.id}/comments` : ""}
        onClose={() => setCommentTarget(null)}
      />
    </div>
  )
}
