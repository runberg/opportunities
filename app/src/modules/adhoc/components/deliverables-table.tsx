"use client"

import { useState, useMemo } from "react"
import { MessageSquarePlus, Search, ChevronLeft, ChevronRight } from "lucide-react"
import type { AgreementRow } from "./adhoc-client"
import { DeliverableModal } from "./deliverable-modal"
import { CommentDialog } from "@/shared/components/ui/comment-dialog"
import { Button } from "@/shared/components/ui/button"
import { formatAmount, cn } from "@/shared/lib/utils"
import { DELIVERABLE_STATUS_BADGE as STATUS_BADGE } from "../constants"

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliverableRow = AgreementRow["deliverables"][number]
type DeliverableStatus = DeliverableRow["status"]

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  NOT_APPROVED: "Not Approved",
  PARTIALLY_APPROVED: "Partial",
  APPROVED: "Approved",
  DELIVERED: "Delivered",
}

const ALL_STATUSES: DeliverableStatus[] = ["NOT_APPROVED", "PARTIALLY_APPROVED", "APPROVED", "DELIVERED"]
const PAGE_SIZE = 10

function compareDeliverables(a: DeliverableRow, b: DeliverableRow): number {
  if (a.internalId === null && b.internalId === null) return b.createdAt.localeCompare(a.createdAt)
  if (a.internalId === null) return -1
  if (b.internalId === null) return 1
  return b.internalId.localeCompare(a.internalId)
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  readonly agreement: AgreementRow
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onRefresh: () => Promise<void>
}

// ─── Component ───────────────────────────────────────────────────────────────

export function DeliverablesTable({ agreement, currentUserId, isAdmin, onRefresh }: Props) {
  const [openDeliverableId, setOpenDeliverableId] = useState<string | null>(null)
  const [commentTarget, setCommentTarget] = useState<DeliverableRow | null>(null)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<Set<DeliverableStatus>>(new Set())
  const [page, setPage] = useState(0)

  const canAdd = agreement.status === "SIGNED" || agreement.status === "ACTIVE"

  function toggleStatus(s: DeliverableStatus) {
    setStatusFilter((prev) => {
      const next = new Set(prev)
      next.has(s) ? next.delete(s) : next.add(s)
      return next
    })
    setPage(0)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    const matches = agreement.deliverables.filter((d) => {
      if (statusFilter.size > 0 && !statusFilter.has(d.status)) return false
      if (q && !d.title.toLowerCase().includes(q) && !(d.internalId?.toLowerCase().includes(q))) return false
      return true
    })
    return matches.sort(compareDeliverables)
  }, [agreement.deliverables, search, statusFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE)

  async function handleAdd() {
    if (!newTitle.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/adhoc/agreements/${agreement.id}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to create work package")
        return
      }
      setNewTitle("")
      setAdding(false)
      await onRefresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          Work Packages ({agreement.deliverables.length})
        </h3>
        {canAdd && !adding && (
          <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
            + Add Work Package
          </Button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Work package title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd()
              if (e.key === "Escape") { setAdding(false); setNewTitle("") }
            }}
          />
          <Button variant="primary" size="sm" onClick={handleAdd} disabled={saving || !newTitle.trim()}>
            {saving ? "Saving…" : "Add"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewTitle("") }}>
            Cancel
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {agreement.deliverables.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">
          {canAdd ? "No work packages yet. Add one above." : "No work packages."}
        </p>
      ) : (
        <>
          {/* Search + status filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative min-w-48">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0) }}
                placeholder="Search…"
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <div className="flex gap-1">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={cn(
                    "px-3 py-2 text-sm rounded-lg border transition-colors",
                    statusFilter.has(s)
                      ? "bg-[#006fff] border-[#006fff] text-white"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  )}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {(search || statusFilter.size > 0) && (
              <button
                type="button"
                className="px-4 py-2 text-gray-500 text-sm rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => { setSearch(""); setStatusFilter(new Set()); setPage(0) }}
              >
                Clear all
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Approved</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Line Items</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Docs</th>
                  <th className="px-4 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-sm text-gray-400">
                      No work packages match your filters.
                    </td>
                  </tr>
                ) : paginated.map((d) => {
                  const lineTotal = d.lineItems.reduce((s, li) => s + Number(li.amount), 0)
                  const approved = Number(d.approvedAmount)
                  const balance = approved - lineTotal
                  const over = lineTotal > approved && approved > 0
                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setOpenDeliverableId(d.id)}
                    >
                      <td className="px-4 py-3 w-28">
                        {d.internalId
                          ? <span className="text-xs font-mono text-gray-500">{d.internalId.slice(6)}</span>
                          : <span className="text-xs text-gray-300">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 max-w-0">
                        <p className="text-gray-900 font-medium truncate">{d.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_BADGE[d.status]}`}>
                          {STATUS_LABEL[d.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                        {approved > 0 ? formatAmount(approved) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600 tabular-nums">
                        {lineTotal > 0 ? formatAmount(lineTotal) : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-medium ${over ? "text-red-600" : "text-gray-600"}`}>
                        {approved > 0 ? formatAmount(balance) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-500">
                        {d.documents.length}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCommentTarget(d) }}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                          title="Add comment"
                        >
                          <MessageSquarePlus size={15} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 px-1">
              <span className="text-sm text-gray-500">
                {filtered.length} work package{filtered.length !== 1 ? "s" : ""}
                {(search || statusFilter.size > 0) ? " (filtered)" : ""}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className={cn(
                    "p-1.5 rounded-lg border border-gray-300 transition-colors",
                    page === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"
                  )}
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-sm text-gray-500 px-1">{page + 1} / {totalPages}</span>
                <button
                  type="button"
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className={cn(
                    "p-1.5 rounded-lg border border-gray-300 transition-colors",
                    page >= totalPages - 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"
                  )}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {openDeliverableId && (
        <DeliverableModal
          deliverableId={openDeliverableId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={() => setOpenDeliverableId(null)}
          onRefresh={onRefresh}
        />
      )}

      <CommentDialog
        target={commentTarget}
        commentEndpoint={commentTarget ? `/api/adhoc/deliverables/${commentTarget.id}/comments` : ""}
        onClose={() => setCommentTarget(null)}
      />
    </div>
  )
}
