"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Trash2, ChevronLeft, ChevronRight } from "lucide-react"
import { Dialog } from "@/shared/components/ui/dialog"
import { type SortDir } from "@/shared/components/ui/sortable-header"
import { OpportunityDataTable } from "@/modules/opportunities/components/opportunity-data-table"

const ALL_STATUSES = [
  { value: "",                      label: "All Statuses" },
  { value: "RFQ_RECEIVED",          label: "RFQ Received" },
  { value: "QUOTE_SENT",            label: "Quote Sent" },
  { value: "EL_REQUEST_RECEIVED",   label: "EL Requested" },
  { value: "EL_DRAFT_SHARED",       label: "EL Draft Shared" },
  { value: "EL_SIGNED_SHARED",      label: "EL Signed Shared" },
  { value: "EL_FULLY_SIGNED",       label: "EL Fully Signed" },
  { value: "PENDING_ADVANCE_PAYMENT", label: "Pending Adv. Payment" },
  { value: "IN_PRODUCTION",         label: "In Production" },
  { value: "DELIVERED",             label: "Delivered" },
]

interface Row {
  id: string
  internalId: string | null
  title: string
  customer: string
  reference: string | null
  product: string | null
  status: string
  rfqDate: string | null
}

export function DeleteOpportunitiesClient() {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [page, setPage] = useState(1)
  const perPage = 50
  const [sortKey, setSortKey] = useState("title")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  function handleSort(key: string, dir: SortDir) { setSortKey(key); setSortDir(dir); setPage(1) }

  const [result, setResult] = useState<{ items: Row[]; total: number } | null>(null)
  const [loading, setLoading] = useState(true)

  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [deleteSuccess, setDeleteSuccess] = useState("")

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(query); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [query])

  // Reset page when filter changes
  useEffect(() => { setPage(1) }, [statusFilter])

  // Fetch
  const fetchData = useCallback(() => {
    setLoading(true)
    const sp = new URLSearchParams({ page: String(page), perPage: String(perPage), sortBy: sortKey, sortDir })
    if (debouncedQuery) sp.set("q", debouncedQuery)
    if (statusFilter) sp.set("status", statusFilter)
    fetch(`/api/opportunities?${sp}`)
      .then((r) => r.json())
      .then((d) => { setResult(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [debouncedQuery, statusFilter, page, perPage, sortKey, sortDir])

  useEffect(() => { fetchData() }, [fetchData])

  const items = result?.items ?? []
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  // Selection helpers
  const allPageSelected = items.length > 0 && items.every((r) => selected.has(r.id))
  const somePageSelected = items.some((r) => selected.has(r.id))

  function toggleAll() {
    if (allPageSelected) {
      setSelected((s) => { const n = new Set(s); items.forEach((r) => n.delete(r.id)); return n })
    } else {
      setSelected((s) => { const n = new Set(s); items.forEach((r) => n.add(r.id)); return n })
    }
  }

  function toggleRow(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleDelete() {
    setDeleting(true)
    setDeleteError("")
    try {
      const ids = Array.from(selected)
      const res = await fetch("/api/opportunities", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      })
      if (res.ok) {
        const d = await res.json()
        setSelected(new Set())
        setConfirmOpen(false)
        setDeleteSuccess(`${d.deleted} ${d.deleted === 1 ? "opportunity" : "opportunities"} deleted.`)
        setTimeout(() => setDeleteSuccess(""), 4000)
        fetchData()
      } else {
        const d = await res.json().catch(() => ({}))
        setDeleteError(d.error ?? "Failed to delete.")
      }
    } catch {
      setDeleteError("Network error. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  const selectedCount = selected.size
  const noun = selectedCount === 1 ? "opportunity" : "opportunities"

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, customer, ID, reference…"
            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
          />
        </div>

        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
        >
          {ALL_STATUSES.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>

        {/* Delete button */}
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={() => { setDeleteError(""); setConfirmOpen(true) }}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Trash2 size={14} />
            Delete {selectedCount} selected
          </button>
        )}
      </div>

      {/* Success banner */}
      {deleteSuccess && (
        <div className="px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          {deleteSuccess}
        </div>
      )}

      {/* Table */}
      <OpportunityDataTable
        rows={items}
        emptyMessage="No opportunities found."
        loading={loading}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={handleSort}
        selectable
        selected={selected}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        allSelected={allPageSelected}
        someSelected={somePageSelected}
      />

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {total === 0
            ? "No results"
            : `${Math.min((page - 1) * perPage + 1, total)}–${Math.min(page * perPage, total)} of ${total}`}
        </span>
        <div className="flex items-center gap-1">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
          >
            <ChevronLeft size={14} />
          </button>
          <span className="px-2">Page {page} of {totalPages}</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-40 transition-colors"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Confirm delete dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Confirm Delete">
        <div className="space-y-4">
          <p className="text-sm text-gray-700">
            You are about to permanently delete{" "}
            <span className="font-semibold text-red-700">{selectedCount} {noun}</span>.
            This cannot be undone — all associated comments and documents will also be deleted.
          </p>
          {deleteError && (
            <p className="text-sm text-red-600">{deleteError}</p>
          )}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
            >
              {deleting ? "Deleting…" : `Delete ${selectedCount} ${noun}`}
            </button>
            <button
              type="button"
              onClick={() => { setConfirmOpen(false); setDeleteError("") }}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
