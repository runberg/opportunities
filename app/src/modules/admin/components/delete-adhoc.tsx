"use client"

import { useState, useEffect, useCallback, type ReactNode } from "react"
import { Trash2 } from "lucide-react"
import { Dialog } from "@/shared/components/ui/dialog"

// ─── Row types ─────────────────────────────────────────────────────────────────

interface AgreementRow {
  id: string
  title: string
  status: string
  createdAt: string
  createdBy: { name: string }
  deliverables: { id: string }[]
}

interface DeliverableRow {
  id: string
  title: string
  status: string
  createdAt: string
  agreement: { id: string; title: string }
}

// ─── Status labels ─────────────────────────────────────────────────────────────

const AGREEMENT_STATUS_LABEL: Record<string, string> = {
  DRAFT: "Draft",
  SIGNED: "Signed",
  ACTIVE: "Active",
  CLOSED: "Closed",
}

const DELIVERABLE_STATUS_LABEL: Record<string, string> = {
  NOT_APPROVED: "Not Approved",
  PARTIALLY_APPROVED: "Partial",
  APPROVED: "Approved",
  DELIVERED: "Delivered",
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function TablePlaceholder({ colSpan, message }: { readonly colSpan: number; readonly message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-8 text-center text-sm text-gray-400">
        {message}
      </td>
    </tr>
  )
}

// ─── Shared hook ───────────────────────────────────────────────────────────────

function useDeleteSection<T extends { id: string }>(
  fetchUrl: string,
  deleteUrlFor: (id: string) => string,
) {
  const [rows, setRows] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const [deleteSuccess, setDeleteSuccess] = useState("")

  const fetchData = useCallback(() => {
    setLoading(true)
    fetch(fetchUrl)
      .then((r) => r.json())
      .then((d: T[]) => { setRows(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [fetchUrl])

  useEffect(() => { fetchData() }, [fetchData])

  const allSelected = rows.length > 0 && rows.every((r) => selected.has(r.id))
  const someSelected = rows.some((r) => selected.has(r.id))

  function toggleRow(id: string) {
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function selectAll() {
    setSelected((s) => { const n = new Set(s); rows.forEach((r) => n.add(r.id)); return n })
  }

  function deselectAll() {
    setSelected((s) => { const n = new Set(s); rows.forEach((r) => n.delete(r.id)); return n })
  }

  async function handleDelete(successMessage: string) {
    setDeleting(true)
    setDeleteError("")
    try {
      const ids = Array.from(selected)
      const results = await Promise.allSettled(
        ids.map((id) => fetch(deleteUrlFor(id), { method: "DELETE" }))
      )
      const failed = results.filter((r) => r.status === "rejected" || (r.status === "fulfilled" && !r.value.ok))
      if (failed.length > 0) {
        setDeleteError(`${failed.length} deletion(s) failed.`)
      } else {
        setSelected(new Set())
        setConfirmOpen(false)
        setDeleteSuccess(successMessage)
        setTimeout(() => setDeleteSuccess(""), 4000)
        fetchData()
      }
    } catch {
      setDeleteError("Network error. Please try again.")
    } finally {
      setDeleting(false)
    }
  }

  return {
    rows,
    loading,
    selected,
    confirmOpen,
    deleting,
    deleteError,
    deleteSuccess,
    allSelected,
    someSelected,
    toggleRow,
    selectAll,
    deselectAll,
    handleDelete,
    openConfirm: () => { setDeleteError(""); setConfirmOpen(true) },
    closeConfirm: () => { setConfirmOpen(false); setDeleteError("") },
  }
}

// ─── Shared confirm dialog ─────────────────────────────────────────────────────

interface DeleteConfirmDialogProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly onConfirm: () => void
  readonly deleting: boolean
  readonly selectedCount: number
  readonly noun: string
  readonly error: string
  readonly children?: ReactNode
}

function DeleteConfirmDialog({
  open, onClose, onConfirm, deleting, selectedCount, noun, error, children,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={onClose} title="Confirm Delete">
      <div className="space-y-4">
        <p className="text-sm text-gray-700 dark:text-gray-300">
          You are about to permanently delete{" "}
          <span className="font-semibold text-red-700 dark:text-red-400">{selectedCount} {noun}</span>.
          This cannot be undone.
        </p>
        {children}
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {deleting ? "Deleting…" : `Delete ${selectedCount} ${noun}`}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Dialog>
  )
}

// ─── Agreements section ────────────────────────────────────────────────────────

function DeleteAgreements() {
  const {
    rows, loading, selected, confirmOpen, deleting, deleteError, deleteSuccess,
    allSelected, someSelected, toggleRow, selectAll, deselectAll, handleDelete, openConfirm, closeConfirm,
  } = useDeleteSection<AgreementRow>("/api/adhoc/agreements", (id) => `/api/adhoc/agreements/${id}`)

  const selectedCount = selected.size
  const noun = selectedCount === 1 ? "agreement" : "agreements"
  const selectedRows = rows.filter((r) => selected.has(r.id))
  const totalWorkPackages = selectedRows.reduce((sum, r) => sum + r.deliverables.length, 0)

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Ad Hoc Agreements
        </h3>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={openConfirm}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Trash2 size={13} />
            Delete {selectedCount} selected
          </button>
        )}
      </div>

      {deleteSuccess && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-300">
          {deleteSuccess}
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={allSelected ? deselectAll : selectAll}
                  className="rounded border-gray-300 dark:border-gray-600"
                  aria-label="Select all agreements"
                />
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Work Pkgs</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Created By</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading && <TablePlaceholder colSpan={6} message="Loading…" />}
            {!loading && rows.length === 0 && <TablePlaceholder colSpan={6} message="No agreements found." />}
            {!loading && rows.map((r) => (
              <tr key={r.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleRow(r.id)}
                    className="rounded border-gray-300 dark:border-gray-600"
                    aria-label={`Select ${r.title}`}
                  />
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{r.title}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{AGREEMENT_STATUS_LABEL[r.status] ?? r.status}</td>
                <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-400">
                  {r.deliverables.length > 0
                    ? <span className="text-amber-600 dark:text-amber-400 font-medium">{r.deliverables.length}</span>
                    : <span className="text-gray-400">0</span>}
                </td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.createdBy.name}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteConfirmDialog
        open={confirmOpen}
        onClose={closeConfirm}
        onConfirm={() => handleDelete(`${selectedCount} ${noun} deleted.`)}
        deleting={deleting}
        selectedCount={selectedCount}
        noun={noun}
        error={deleteError}
      >
        {totalWorkPackages > 0 && (
          <div className="flex gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg">
            <span className="text-amber-500 mt-0.5 shrink-0">⚠</span>
            <p className="text-sm text-amber-800 dark:text-amber-300">
              The selected {noun} contain{selectedCount === 1 ? "s" : ""}{" "}
              <span className="font-semibold">{totalWorkPackages} work {totalWorkPackages === 1 ? "package" : "packages"}</span>{" "}
              that will also be permanently deleted along with all their line items and documents.
            </p>
          </div>
        )}
      </DeleteConfirmDialog>
    </div>
  )
}

// ─── Work packages section ─────────────────────────────────────────────────────

function DeleteWorkPackages() {
  const {
    rows, loading, selected, confirmOpen, deleting, deleteError, deleteSuccess,
    allSelected, someSelected, toggleRow, selectAll, deselectAll, handleDelete, openConfirm, closeConfirm,
  } = useDeleteSection<DeliverableRow>("/api/adhoc/deliverables", (id) => `/api/adhoc/deliverables/${id}`)

  const selectedCount = selected.size
  const noun = selectedCount === 1 ? "work package" : "work packages"

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
          Ad Hoc Work Packages
        </h3>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={openConfirm}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Trash2 size={13} />
            Delete {selectedCount} selected
          </button>
        )}
      </div>

      {deleteSuccess && (
        <div className="px-4 py-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-sm text-green-800 dark:text-green-300">
          {deleteSuccess}
        </div>
      )}

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr>
              <th className="px-4 py-2.5 w-10">
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={allSelected ? deselectAll : selectAll}
                  className="rounded border-gray-300 dark:border-gray-600"
                  aria-label="Select all work packages"
                />
              </th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Title</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Agreement</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Status</th>
              <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {loading && <TablePlaceholder colSpan={5} message="Loading…" />}
            {!loading && rows.length === 0 && <TablePlaceholder colSpan={5} message="No work packages found." />}
            {!loading && rows.map((r) => (
              <tr key={r.id} className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(r.id)}
                    onChange={() => toggleRow(r.id)}
                    className="rounded border-gray-300 dark:border-gray-600"
                    aria-label={`Select ${r.title}`}
                  />
                </td>
                <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">{r.title}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{r.agreement.title}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{DELIVERABLE_STATUS_LABEL[r.status] ?? r.status}</td>
                <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <DeleteConfirmDialog
        open={confirmOpen}
        onClose={closeConfirm}
        onConfirm={() => handleDelete(`${selectedCount} ${noun} deleted.`)}
        deleting={deleting}
        selectedCount={selectedCount}
        noun={noun}
        error={deleteError}
      >
        <p className="text-sm text-gray-600 dark:text-gray-400">
          All associated line items and documents will also be permanently deleted.
        </p>
      </DeleteConfirmDialog>
    </div>
  )
}

// ─── Combined export ───────────────────────────────────────────────────────────

export function DeleteAdhocClient() {
  return (
    <div className="space-y-8">
      <DeleteAgreements />
      <DeleteWorkPackages />
    </div>
  )
}
