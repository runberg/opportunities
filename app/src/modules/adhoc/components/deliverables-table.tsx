"use client"

import { useState, useMemo } from "react"
import { MessageSquarePlus } from "lucide-react"
import type { AgreementRow } from "./adhoc-client"
import { DeliverableModal } from "./deliverable-modal"
import { CommentDialog } from "@/shared/components/ui/comment-dialog"
import { Button } from "@/shared/components/ui/button"
import { formatAmount } from "@/shared/lib/utils"
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
    return matches.sort((a, b) => {
      if (a.internalId === null && b.internalId === null) {
        return b.createdAt.localeCompare(a.createdAt)
      }
      if (a.internalId === null) return -1
      if (b.internalId === null) return 1
      return b.internalId.localeCompare(a.internalId)
    })
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
        <h3 className="text-sm font-medium text-gray-300">
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
            className="flex-1 rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input
              type="search"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search…"
              className="rounded-md border border-gray-600 bg-gray-800 px-3 py-1.5 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 w-48"
            />
            <div className="flex gap-1">
              {ALL_STATUSES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStatus(s)}
                  className={[
                    "px-2.5 py-1 text-xs rounded-full border transition-colors",
                    statusFilter.has(s)
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300",
                  ].join(" ")}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
            {(search || statusFilter.size > 0) && (
              <button
                type="button"
                className="text-xs text-gray-500 hover:text-gray-300"
                onClick={() => { setSearch(""); setStatusFilter(new Set()); setPage(0) }}
              >
                Clear
              </button>
            )}
          </div>

          {/* Table */}
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide w-32">ID</th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Title</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-400 uppercase tracking-wide">Status</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Approved</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Line Items</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Balance</th>
                  <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-400 uppercase tracking-wide">Docs</th>
                  <th className="px-4 py-2.5 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
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
                      className="bg-gray-800 hover:bg-gray-700/50 transition-colors cursor-pointer"
                      onClick={() => setOpenDeliverableId(d.id)}
                    >
                      <td className="px-4 py-3 w-28">
                        {d.internalId
                          ? <span className="text-xs font-mono text-gray-400">{d.internalId.slice(6)}</span>
                          : <span className="text-xs text-gray-600">—</span>
                        }
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-gray-100 font-medium">{d.title}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_BADGE[d.status]}`}>
                          {STATUS_LABEL[d.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                        {approved > 0 ? formatAmount(approved) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-300 tabular-nums">
                        {lineTotal > 0 ? formatAmount(lineTotal) : "—"}
                      </td>
                      <td className={`px-4 py-3 text-right tabular-nums font-medium ${over ? "text-red-400" : "text-gray-300"}`}>
                        {approved > 0 ? formatAmount(balance) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-400">
                        {d.documents.length}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setCommentTarget(d) }}
                          className="p-1 text-gray-500 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
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
            <div className="flex items-center justify-between mt-3">
              <p className="text-xs text-gray-500">
                {filtered.length} work package{filtered.length !== 1 ? "s" : ""}
                {(search || statusFilter.size > 0) ? " (filtered)" : ""}
              </p>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                  ‹ Prev
                </Button>
                <span className="text-xs text-gray-400 px-2">{page + 1} / {totalPages}</span>
                <Button size="sm" variant="ghost" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                  Next ›
                </Button>
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
