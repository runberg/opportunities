"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Button } from "@/shared/components/ui/button"
import { formatDate, formatDateTime } from "@/shared/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type LineItem = {
  id: string
  description: string
  amount: string
}

type AdhocDoc = {
  id: string
  displayName: string
  type: "BUDGET" | "APPROVAL"
  notes: string | null
  uploadedAt: string
  uploadedBy: { id: string; name: string }
}

type LogEntry = {
  id: string
  type: string
  message: string
  createdAt: string
  user: { id: string; name: string } | null
}

type Deliverable = {
  id: string
  title: string
  description: string | null
  approvedAmount: string
  status: "NOT_APPROVED" | "PARTIALLY_APPROVED" | "APPROVED" | "DELIVERED"
  createdAt: string
  createdBy: { id: string; name: string }
  agreement: { id: string; title: string; version: number; status: string }
  lineItems: LineItem[]
  documents: AdhocDoc[]
  systemLogs: LogEntry[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  NOT_APPROVED: "Not Approved",
  PARTIALLY_APPROVED: "Partially Approved",
  APPROVED: "Approved",
  DELIVERED: "Delivered",
}

const STATUS_BADGE: Record<string, string> = {
  NOT_APPROVED: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  PARTIALLY_APPROVED: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  APPROVED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  DELIVERED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
}

const STATUS_TRANSITIONS: Record<string, { label: string; next: string }[]> = {
  NOT_APPROVED: [{ label: "Mark Partially Approved", next: "PARTIALLY_APPROVED" }, { label: "Mark Approved", next: "APPROVED" }],
  PARTIALLY_APPROVED: [{ label: "Mark Approved", next: "APPROVED" }],
  APPROVED: [{ label: "Mark Delivered", next: "DELIVERED" }],
  DELIVERED: [],
}

function formatAmount(v: string | number) {
  return Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// ─── Line Items ───────────────────────────────────────────────────────────────

function LineItemsTab({
  deliverable,
  isLocked,
  onRefresh,
}: {
  deliverable: Deliverable
  isLocked: boolean
  onRefresh: () => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState("")
  const [editAmt, setEditAmt] = useState("")
  const [adding, setAdding] = useState(false)
  const [newDesc, setNewDesc] = useState("")
  const [newAmt, setNewAmt] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lineTotal = deliverable.lineItems.reduce((s, li) => s + Number(li.amount), 0)
  const approved = Number(deliverable.approvedAmount)
  const balance = approved - lineTotal
  const over = lineTotal > approved && approved > 0

  function startEdit(li: LineItem) {
    setEditingId(li.id)
    setEditDesc(li.description)
    setEditAmt(li.amount)
  }

  async function saveEdit(id: string) {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/adhoc/line-items/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: editDesc, amount: Number(editAmt) }),
      })
      if (!res.ok) { setError((await res.json()).error ?? "Save failed"); return }
      setEditingId(null)
      await onRefresh()
    } finally {
      setSaving(false)
    }
  }

  async function deleteItem(id: string) {
    setSaving(true)
    try {
      await fetch(`/api/adhoc/line-items/${id}`, { method: "DELETE" })
      await onRefresh()
    } finally {
      setSaving(false)
    }
  }

  async function addItem() {
    if (!newDesc.trim() || newAmt === "") return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/adhoc/deliverables/${deliverable.id}/line-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: newDesc.trim(), amount: Number(newAmt) }),
      })
      if (!res.ok) { setError((await res.json()).error ?? "Failed to add"); return }
      setNewDesc("")
      setNewAmt("")
      setAdding(false)
      await onRefresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      {/* Totals bar */}
      <div className="flex gap-6 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Approved: </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {approved > 0 ? formatAmount(approved) : "—"}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Line items total: </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">{formatAmount(lineTotal)}</span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Balance: </span>
          <span className={`font-semibold ${over ? "text-red-600" : "text-gray-900 dark:text-gray-100"}`}>
            {approved > 0 ? formatAmount(balance) : "—"}
          </span>
        </div>
        {over && (
          <span className="ml-auto text-xs text-red-600 font-medium self-center">
            ⚠ Exceeds approved — new approval needed
          </span>
        )}
      </div>

      {/* Table */}
      {deliverable.lineItems.length > 0 && (
        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="py-2 text-right text-xs font-medium text-gray-500 uppercase w-36">Amount</th>
              {!isLocked && <th className="py-2 w-20" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {deliverable.lineItems.map((li) =>
              editingId === li.id ? (
                <tr key={li.id}>
                  <td className="py-1.5 pr-2">
                    <input
                      autoFocus
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-right text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editAmt}
                      onChange={(e) => setEditAmt(e.target.value)}
                    />
                  </td>
                  <td className="py-1.5">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="primary" onClick={() => saveEdit(li.id)} disabled={saving}>
                        Save
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        Cancel
                      </Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={li.id} className="group">
                  <td className="py-2 text-gray-800 dark:text-gray-200">{li.description}</td>
                  <td className="py-2 text-right text-gray-800 dark:text-gray-200 tabular-nums">
                    {formatAmount(li.amount)}
                  </td>
                  {!isLocked && (
                    <td className="py-2">
                      <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button size="sm" variant="ghost" onClick={() => startEdit(li)}>Edit</Button>
                        <Button size="sm" variant="danger" onClick={() => deleteItem(li.id)}>Del</Button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            )}
          </tbody>
        </table>
      )}

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {/* Add row */}
      {!isLocked && (
        adding ? (
          <div className="flex gap-2 mt-2">
            <input
              autoFocus
              className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") { setAdding(false) } }}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              className="w-32 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-right text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Amount"
              value={newAmt}
              onChange={(e) => setNewAmt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") addItem() }}
            />
            <Button size="sm" variant="primary" onClick={addItem} disabled={saving || !newDesc.trim() || newAmt === ""}>
              {saving ? "…" : "Add"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewDesc(""); setNewAmt("") }}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button size="sm" variant="secondary" className="mt-2" onClick={() => setAdding(true)}>
            + Add Line Item
          </Button>
        )
      )}
    </div>
  )
}

// ─── Documents ────────────────────────────────────────────────────────────────

function DocumentsTab({
  deliverable,
  currentUserId,
  isAdmin,
  isLocked,
  onRefresh,
}: {
  deliverable: Deliverable
  currentUserId: string
  isAdmin: boolean
  isLocked: boolean
  onRefresh: () => Promise<void>
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState<"BUDGET" | "APPROVAL">("BUDGET")
  const [notes, setNotes] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)

  async function handleUpload(file: File) {
    if (!displayName.trim()) { setUploadError("Please enter a display name"); return }
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("displayName", displayName.trim())
      fd.append("type", docType)
      if (notes.trim()) fd.append("notes", notes.trim())
      const res = await fetch(`/api/adhoc/deliverables/${deliverable.id}/documents`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) { setUploadError((await res.json()).error ?? "Upload failed"); return }
      setDisplayName("")
      setNotes("")
      if (fileRef.current) fileRef.current.value = ""
      await onRefresh()
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(docId: string) {
    await fetch(`/api/adhoc/documents/${docId}`, { method: "DELETE" })
    await onRefresh()
  }

  const budget = deliverable.documents.filter((d) => d.type === "BUDGET")
  const approval = deliverable.documents.filter((d) => d.type === "APPROVAL")

  function DocList({ docs, label }: { docs: AdhocDoc[]; label: string }) {
    return (
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">{label}</p>
        {docs.length === 0 ? (
          <p className="text-xs text-gray-400 italic">None uploaded</p>
        ) : (
          <ul className="space-y-1.5">
            {docs.map((doc) => (
              <li key={doc.id} className="flex items-start justify-between gap-2 text-sm group">
                <div className="min-w-0">
                  <a
                    href={`/api/adhoc/documents/${doc.id}`}
                    className="font-medium text-blue-600 dark:text-blue-400 hover:underline truncate block"
                    download
                  >
                    {doc.displayName}
                  </a>
                  {doc.notes && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{doc.notes}</p>
                  )}
                  <p className="text-xs text-gray-400">
                    {doc.uploadedBy.name} · {formatDate(doc.uploadedAt)}
                  </p>
                </div>
                {(!isLocked || isAdmin) && (doc.uploadedBy.id === currentUserId || isAdmin) && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="opacity-0 group-hover:opacity-100 shrink-0 text-red-500 hover:text-red-600"
                    onClick={() => handleDelete(doc.id)}
                  >
                    Delete
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div>
      <DocList docs={budget} label="Budget" />
      <DocList docs={approval} label="Approval" />

      {(!isLocked || isAdmin) && (
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Upload document</p>
          <div className="flex flex-wrap gap-2 mb-2">
            <select
              className="rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
              value={docType}
              onChange={(e) => setDocType(e.target.value as "BUDGET" | "APPROVAL")}
            >
              <option value="BUDGET">Budget</option>
              <option value="APPROVAL">Approval</option>
            </select>
            <input
              className="flex-1 min-w-36 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <input
              className="flex-1 min-w-48 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notes (optional — e.g. covers items 1–3)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv"
            className="text-sm text-gray-700 dark:text-gray-300"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleUpload(file)
            }}
            disabled={uploading}
          />
          {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
          {uploading && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
        </div>
      )}
    </div>
  )
}

// ─── Change Log ───────────────────────────────────────────────────────────────

function ChangeLogTab({ logs }: { logs: LogEntry[] }) {
  if (logs.length === 0)
    return <p className="text-sm text-gray-400 py-4 text-center">No activity yet.</p>

  return (
    <ul className="space-y-3">
      {logs.map((entry) => (
        <li key={entry.id} className="flex gap-3 text-sm">
          <div className="mt-0.5 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0 mt-2" />
          <div>
            <p className="text-gray-800 dark:text-gray-200">{entry.message}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {entry.user?.name ?? "System"} · {formatDateTime(entry.createdAt)}
            </p>
          </div>
        </li>
      ))}
    </ul>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

type Props = {
  readonly deliverableId: string
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onClose: () => void
  readonly onRefresh: () => Promise<void>
}

export function DeliverableModal({ deliverableId, currentUserId, isAdmin, onClose, onRefresh }: Props) {
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<"items" | "documents" | "log">("items")
  const [transitioning, setTransitioning] = useState(false)
  const [editingHeader, setEditingHeader] = useState(false)
  const [headerTitle, setHeaderTitle] = useState("")
  const [headerDesc, setHeaderDesc] = useState("")
  const [headerApproved, setHeaderApproved] = useState("")
  const [headerSaving, setHeaderSaving] = useState(false)
  const [headerError, setHeaderError] = useState<string | null>(null)

  const fetchDeliverable = useCallback(async () => {
    const res = await fetch(`/api/adhoc/deliverables/${deliverableId}`)
    if (res.ok) setDeliverable(await res.json())
    setLoading(false)
  }, [deliverableId])

  useEffect(() => { fetchDeliverable() }, [fetchDeliverable])

  async function refresh() {
    await fetchDeliverable()
    await onRefresh()
  }

  function startEditHeader() {
    if (!deliverable) return
    setHeaderTitle(deliverable.title)
    setHeaderDesc(deliverable.description ?? "")
    setHeaderApproved(deliverable.approvedAmount)
    setHeaderError(null)
    setEditingHeader(true)
  }

  async function saveHeader() {
    if (!deliverable) return
    setHeaderSaving(true)
    setHeaderError(null)
    try {
      const res = await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: headerTitle,
          description: headerDesc || null,
          approvedAmount: Number(headerApproved),
        }),
      })
      if (!res.ok) { setHeaderError((await res.json()).error ?? "Save failed"); return }
      setEditingHeader(false)
      await refresh()
    } finally {
      setHeaderSaving(false)
    }
  }

  async function handleTransition(nextStatus: string) {
    if (!deliverable) return
    setTransitioning(true)
    try {
      await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      })
      await refresh()
    } finally {
      setTransitioning(false)
    }
  }

  const isLocked = deliverable?.status === "DELIVERED" && !isAdmin

  const tabs = [
    { key: "items" as const, label: `Line Items${deliverable ? ` (${deliverable.lineItems.length})` : ""}` },
    { key: "documents" as const, label: `Documents${deliverable ? ` (${deliverable.documents.length})` : ""}` },
    { key: "log" as const, label: "Change Log" },
  ]

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />

      {/* Slide-over */}
      <div className="relative ml-auto w-full max-w-2xl h-full bg-white dark:bg-gray-900 shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0 pr-4">
            {loading ? (
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : editingHeader ? (
              <input
                autoFocus
                className="w-full text-lg font-semibold bg-transparent border-b border-gray-300 dark:border-gray-600 focus:outline-none text-gray-900 dark:text-gray-100"
                value={headerTitle}
                onChange={(e) => setHeaderTitle(e.target.value)}
              />
            ) : (
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 truncate">
                {deliverable?.title}
              </h2>
            )}
            {deliverable && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {deliverable.agreement.title} · Created by {deliverable.createdBy.name}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Meta bar */}
        {deliverable && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            {editingHeader ? (
              <div className="space-y-2">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs text-gray-500 mb-1">Description</label>
                    <textarea
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      rows={2}
                      value={headerDesc}
                      onChange={(e) => setHeaderDesc(e.target.value)}
                      placeholder="Optional description"
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-xs text-gray-500 mb-1">Approved Amount</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-right text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={headerApproved}
                      onChange={(e) => setHeaderApproved(e.target.value)}
                    />
                  </div>
                </div>
                {headerError && <p className="text-xs text-red-600">{headerError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="primary" onClick={saveHeader} disabled={headerSaving}>
                    {headerSaving ? "Saving…" : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setEditingHeader(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <div className="flex gap-6">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Status</p>
                    <span className={`inline-flex mt-0.5 px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_BADGE[deliverable.status]}`}>
                      {STATUS_LABEL[deliverable.status]}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Approved Amount</p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mt-0.5">
                      {Number(deliverable.approvedAmount) > 0 ? formatAmount(deliverable.approvedAmount) : "—"}
                    </p>
                  </div>
                  {deliverable.description && (
                    <div className="max-w-xs">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Description</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mt-0.5">{deliverable.description}</p>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {!isLocked && (
                    <Button size="sm" variant="ghost" onClick={startEditHeader}>Edit</Button>
                  )}
                  {STATUS_TRANSITIONS[deliverable.status]?.map((t) => (
                    <Button
                      key={t.next}
                      size="sm"
                      variant="outline"
                      onClick={() => handleTransition(t.next)}
                      disabled={transitioning}
                    >
                      {transitioning ? "Saving…" : t.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === t.key
                  ? "border-blue-600 text-blue-600 dark:text-blue-400"
                  : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              ))}
            </div>
          ) : deliverable ? (
            <>
              {activeTab === "items" && (
                <LineItemsTab deliverable={deliverable} isLocked={!!isLocked} onRefresh={refresh} />
              )}
              {activeTab === "documents" && (
                <DocumentsTab
                  deliverable={deliverable}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  isLocked={!!isLocked}
                  onRefresh={refresh}
                />
              )}
              {activeTab === "log" && <ChangeLogTab logs={deliverable.systemLogs} />}
            </>
          ) : (
            <p className="text-sm text-gray-400">Failed to load.</p>
          )}
        </div>
      </div>
    </div>
  )
}
