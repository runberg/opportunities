"use client"

import { useState, useMemo } from "react"
import { MessageSquarePlus, Download } from "lucide-react"
import type { AgreementRow } from "./adhoc-client"
import { DeliverableModal } from "./deliverable-modal"
import { CommentDialog } from "@/shared/components/ui/comment-dialog"
import { Button } from "@/shared/components/ui/button"
import { TableFilterBar, type FilterStatusGroup } from "@/shared/components/ui/table-filter-bar"
import { ClientPagination } from "@/shared/components/ui/client-pagination"
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

const STATUS_GROUPS: FilterStatusGroup[] = [
  { label: "", statuses: ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] })) },
]

// ─── Module-level helpers ─────────────────────────────────────────────────────

function compareDeliverables(a: DeliverableRow, b: DeliverableRow): number {
  if (a.internalId === null && b.internalId === null) return b.createdAt.localeCompare(a.createdAt)
  if (a.internalId === null) return -1
  if (b.internalId === null) return 1
  return b.internalId.localeCompare(a.internalId)
}

function filterDeliverables(
  deliverables: DeliverableRow[],
  query: string,
  statusFilter: Set<DeliverableStatus>
): DeliverableRow[] {
  const q = query.trim().toLowerCase()
  return deliverables
    .filter((d) => {
      if (statusFilter.size > 0 && !statusFilter.has(d.status)) return false
      if (q && !d.title.toLowerCase().includes(q) && !d.internalId?.toLowerCase().includes(q)) return false
      return true
    })
    .sort(compareDeliverables)
}

function buildCsvRow(d: DeliverableRow): string[] {
  const approved = Number(d.approvedAmount)
  const lineTotal = d.lineItems.reduce((s, li) => s + Number(li.amount), 0)
  return [
    d.internalId?.slice(6) ?? "",
    d.title,
    STATUS_LABEL[d.status] ?? d.status,
    approved > 0 ? approved.toFixed(2) : "",
    lineTotal > 0 ? lineTotal.toFixed(2) : "",
    approved > 0 ? (approved - lineTotal).toFixed(2) : "",
    d.documents.length.toString(),
  ]
}

function exportToCsv(agreementTitle: string, deliverables: DeliverableRow[]) {
  const header = ["ID", "Title", "Status", "Approved", "Line Items", "Balance", "Documents"]
  const csv = [header, ...deliverables.map(buildCsvRow)]
    .map((r) => r.map((c) => `"${String(c).replaceAll('"', '""')}"`).join(","))
    .join("\n")
  const blob = new Blob([csv], { type: "text/csv" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${agreementTitle.replaceAll(/[^a-z0-9]/gi, "-").toLowerCase()}-work-packages.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Row component ────────────────────────────────────────────────────────────

type RowProps = {
  readonly d: DeliverableRow
  readonly onOpen: (id: string) => void
  readonly onComment: (d: DeliverableRow) => void
}

function DeliverableTableRow({ d, onOpen, onComment }: RowProps) {
  const lineTotal = d.lineItems.reduce((s, li) => s + Number(li.amount), 0)
  const approved = Number(d.approvedAmount)
  const balance = approved - lineTotal
  const over = lineTotal > approved && approved > 0
  return (
    <tr
      className="hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onOpen(d.id)}
    >
      <td className="px-4 py-3 w-28">
        {d.internalId
          ? <span className="text-xs font-mono text-gray-500">{d.internalId.slice(6)}</span>
          : <span className="text-xs text-gray-300">—</span>
        }
      </td>
      <td className="px-4 py-3">
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
      <td className="px-2 py-3 text-right" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={() => onComment(d)}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
          title="Add comment"
        >
          <MessageSquarePlus size={15} />
        </button>
      </td>
    </tr>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

type Props = {
  readonly agreement: AgreementRow
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onRefresh: () => Promise<void>
}

// ─── Main component ───────────────────────────────────────────────────────────

export function DeliverablesTable({ agreement, currentUserId, isAdmin, onRefresh }: Props) {
  const [openDeliverableId, setOpenDeliverableId] = useState<string | null>(null)
  const [commentTarget, setCommentTarget] = useState<DeliverableRow | null>(null)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<Set<DeliverableStatus>>(new Set())
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)

  const canAdd = agreement.status === "SIGNED" || agreement.status === "ACTIVE"

  const filtered = useMemo(
    () => filterDeliverables(agreement.deliverables, search, statusFilter),
    [agreement.deliverables, search, statusFilter]
  )

  const paginated = filtered.slice((page - 1) * perPage, page * perPage)

  function handleToggleStatus(s: string) {
    const val = s as DeliverableStatus
    setStatusFilter((prev) => {
      const next = new Set(prev)
      next.has(val) ? next.delete(val) : next.add(val)
      return next
    })
    setPage(1)
  }

  async function handleAdd() {
    if (!newTitle.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/adhoc/agreements/${agreement.id}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim(), createdAt: newDate }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to create work package")
        return
      }
      setNewTitle("")
      setNewDate(new Date().toISOString().slice(0, 10))
      setAdding(false)
      await onRefresh()
    } finally {
      setSaving(false)
    }
  }

  const exportNode = (
    <button
      type="button"
      onClick={() => exportToCsv(agreement.title, filtered)}
      className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg text-sm transition-colors ml-auto"
    >
      <Download size={14} />
      Export CSV
    </button>
  )

  return (
    <div>
      {/* Header */}
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
          <input
            type="date"
            className="rounded-md border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
          />
          <Button variant="primary" size="sm" onClick={handleAdd} disabled={saving || !newTitle.trim()}>
            {saving ? "Saving…" : "Add"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewTitle(""); setNewDate(new Date().toISOString().slice(0, 10)) }}>
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
          <TableFilterBar
            search={search}
            onSearchChange={(q) => { setSearch(q); setPage(1) }}
            placeholder="Search by title or ID…"
            selectedStatuses={[...statusFilter]}
            onToggleStatus={handleToggleStatus}
            onClearStatuses={() => { setStatusFilter(new Set()); setPage(1) }}
            onClearAll={() => { setSearch(""); setStatusFilter(new Set()); setPage(1) }}
            statusGroups={STATUS_GROUPS}
            exportNode={exportNode}
          />

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">ID</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Status</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Approved</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Line Items</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Balance</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide w-14">Docs</th>
                  <th className="px-2 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                      No work packages match your filters.
                    </td>
                  </tr>
                ) : paginated.map((d) => (
                  <DeliverableTableRow
                    key={d.id}
                    d={d}
                    onOpen={setOpenDeliverableId}
                    onComment={setCommentTarget}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <ClientPagination
            page={page}
            total={filtered.length}
            perPage={perPage}
            onPageChange={setPage}
            onPerPageChange={(n) => { setPerPage(n); setPage(1) }}
          />
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
