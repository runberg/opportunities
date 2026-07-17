"use client"

import { useState, useEffect, useCallback } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { PdfViewerModal } from "@/shared/components/ui/pdf-viewer-modal"
import { LogSection, type LogEntry } from "@/shared/components/ui/log-section"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { formatAmount, nameFromFile } from "@/shared/lib/utils"
import { useDropZone, useWindowDragExpand } from "@/shared/lib/use-drop-zone"
import { FileDropZone } from "@/shared/components/ui/file-drop-zone"
import { AdhocDocList } from "./adhoc-doc-list"
import { DELIVERABLE_STATUS_BADGE as STATUS_BADGE } from "../constants"

// ─── Types ────────────────────────────────────────────────────────────────────

type LineItem = {
  id: string
  description: string
  amount: string
}

type AdhocDoc = {
  id: string
  displayName: string
  originalName: string
  mimeType: string
  size: number
  type: "BUDGET" | "APPROVAL" | "DELIVERY_NOTE" | "OTHER"
  notes: string | null
  uploadedAt: string
  uploadedBy: { id: string; name: string }
}

type SystemLogEntry = {
  id: string
  type: string
  message: string
  createdAt: string
  user: { id: string; name: string } | null
}

type CommentEntry = {
  id: string
  content: string
  system: boolean
  createdAt: string
  author: { id: string; name: string } | null
}

type Deliverable = {
  id: string
  internalId: string | null
  title: string
  description: string | null
  approvedAmount: string
  approverName: string | null
  status: "NOT_APPROVED" | "PARTIALLY_APPROVED" | "APPROVED" | "DELIVERED"
  partiallyApprovedAt: string | null
  approvedAt: string | null
  deliveredAt: string | null
  createdAt: string
  createdBy: { id: string; name: string }
  agreement: { id: string; title: string; status: string }
  lineItems: LineItem[]
  documents: AdhocDoc[]
  systemLogs: SystemLogEntry[]
  comments: CommentEntry[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  NOT_APPROVED: "Not Approved",
  PARTIALLY_APPROVED: "Partially Approved",
  APPROVED: "Approved",
  DELIVERED: "Delivered",
}

function lineItemTotal(items: LineItem[]) {
  return items.reduce((s, li) => s + Number(li.amount), 0)
}

function PartialApprovalWarning({ show, lineTotal }: { readonly show: boolean; readonly lineTotal: number }) {
  if (!show) return null
  return (
    <p className="text-xs text-amber-400 bg-amber-900/20 px-3 py-2 rounded-md">
      Approved amount is less than the line item total ({formatAmount(lineTotal)}) — this will be set to <strong>Partially Approved</strong>.
    </p>
  )
}

// ─── Approve form (initial approval — NOT_APPROVED only) ─────────────────────

function ApproveForm({
  deliverable,
  onDone,
  onClose,
}: {
  readonly deliverable: Deliverable
  readonly onDone: () => Promise<void>
  readonly onClose: () => void
}) {
  const lineTotal = lineItemTotal(deliverable.lineItems)
  const [amount, setAmount] = useState(lineTotal > 0 ? String(lineTotal) : "")
  const [approverName, setApproverName] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [docFile, setDocFile] = useState<File | null>(null)

  const amtNum = Number(amount)
  const willBePartial = amount !== "" && !Number.isNaN(amtNum) && amtNum >= 0 && lineTotal > amtNum

  function applyFile(f: File) {
    setDocFile(f)
    setDisplayName((prev) => prev.trim() === "" ? nameFromFile(f) : prev)
  }

  const { dragging, onDragOver, onDragLeave, onDrop } = useDropZone(applyFile)

  function reset() {
    onClose()
    setAmount("")
    setApproverName("")
    setDisplayName("")
    setDocFile(null)
    setError(null)
  }

  async function handleApprove() {
    if (amount === "" || Number.isNaN(amtNum) || amtNum < 0) {
      setError("Please enter a valid approved amount (0 or more)")
      return
    }
    setSaving(true)
    setError(null)
    try {
      if (docFile) {
        if (!displayName.trim()) { setError("Please enter a display name for the document"); setSaving(false); return }
        setUploading(true)
        const fd = new FormData()
        fd.append("file", docFile)
        fd.append("displayName", displayName.trim())
        fd.append("type", "APPROVAL")
        const upRes = await fetch(`/api/adhoc/deliverables/${deliverable.id}/documents`, { method: "POST", body: fd })
        setUploading(false)
        if (!upRes.ok) { setError((await upRes.json() as { error?: string }).error ?? "Upload failed"); return }
      }
      const res = await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve: true, approvedAmount: amtNum, approverName: approverName.trim() || null }),
      })
      if (!res.ok) { setError((await res.json() as { error?: string }).error ?? "Save failed"); return }
      reset()
      await onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
      <div className="flex flex-wrap gap-3 items-start">
        <div className="flex gap-3 items-end">
          <div>
            <label htmlFor="approve-amount" className="block text-xs text-gray-400 mb-1">
              Approved Amount <span className="text-red-500">*</span>
            </label>
            <input
              id="approve-amount"
              autoFocus
              type="number"
              min="0"
              step="0.01"
              className="w-36 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-right text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleApprove() }}
            />
          </div>
          <div>
            <label htmlFor="approve-approver" className="block text-xs text-gray-400 mb-1">
              Approver <span className="text-gray-600">(optional)</span>
            </label>
            <input
              id="approve-approver"
              type="text"
              className="w-44 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Approver name"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleApprove() }}
            />
          </div>
        </div>
        <div className="flex-1 min-w-60">
          {deliverable.documents.some((d) => d.type === "APPROVAL") && (
            <div className="mb-2 px-2.5 py-2 bg-green-900/20 border border-green-800/60 rounded-lg">
              <p className="text-xs font-medium text-green-400 mb-1">Approval document already uploaded</p>
              <ul className="space-y-0.5">
                {deliverable.documents.filter((d) => d.type === "APPROVAL").map((doc) => (
                  <li key={doc.id} className="text-xs text-green-300">✓ {doc.displayName}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-gray-400 mb-1">
            {deliverable.documents.some((d) => d.type === "APPROVAL")
              ? "Upload additional approval document"
              : <>Approval Document <span className="font-normal text-gray-500">(optional)</span></>
            }
          </p>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <FileDropZone
            file={docFile}
            dragging={dragging}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onFile={applyFile}
            accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg"
            compact
          />
          {uploading && <p className="text-xs text-gray-500 mt-0.5">Uploading…</p>}
        </div>
      </div>

      <PartialApprovalWarning show={willBePartial} lineTotal={lineTotal} />
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={handleApprove} disabled={saving || uploading}>
          {saving ? "Saving…" : "Confirm Approval"}
        </Button>
        <Button size="sm" variant="ghost" onClick={reset}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── Approval edit panel (PARTIALLY_APPROVED or APPROVED) ────────────────────

function ApprovalEditPanel({
  deliverable,
  onDone,
  onClose,
}: {
  readonly deliverable: Deliverable
  readonly onDone: () => Promise<void>
  readonly onClose: () => void
}) {
  const [amount, setAmount] = useState(deliverable.approvedAmount)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lineTotal = lineItemTotal(deliverable.lineItems)
  const amtNum = Number(amount)
  const willBePartial = !Number.isNaN(amtNum) && amtNum >= 0 && lineTotal > amtNum

  async function handleUpdate() {
    if (Number.isNaN(amtNum) || amtNum < 0) { setError("Amount must be 0 or more"); return }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approve: true, approvedAmount: amtNum }),
      })
      if (!res.ok) { setError((await res.json() as { error?: string }).error ?? "Save failed"); return }
      onClose()
      await onDone()
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    setError(null)
    try {
      const res = await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeApproval: true }),
      })
      if (!res.ok) { setError((await res.json() as { error?: string }).error ?? "Failed"); return }
      onClose()
      await onDone()
    } finally {
      setRemoving(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
      <div>
        <label htmlFor="edit-approval-amount" className="block text-xs text-gray-400 mb-1">
          Approved Amount
        </label>
        <input
          id="edit-approval-amount"
          autoFocus
          type="number"
          min="0"
          step="0.01"
          className="w-36 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-right text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleUpdate() }}
        />
      </div>

      <PartialApprovalWarning show={willBePartial} lineTotal={lineTotal} />
      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex items-center justify-between">
        <Button size="sm" variant="danger" onClick={handleRemove} disabled={saving || removing}>
          {removing ? "Removing…" : "Remove Approval"}
        </Button>
        <div className="flex gap-2">
          <Button size="sm" variant="primary" onClick={handleUpdate} disabled={saving || removing}>
            {saving ? "Saving…" : "Update"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}

// ─── Line Items ───────────────────────────────────────────────────────────────

function LineItemsTab({
  deliverable,
  isLocked,
  onRefresh,
}: {
  readonly deliverable: Deliverable
  readonly isLocked: boolean
  readonly onRefresh: () => Promise<void>
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState("")
  const [editAmt, setEditAmt] = useState("")
  const [adding, setAdding] = useState(false)
  const [newDesc, setNewDesc] = useState("")
  const [newAmt, setNewAmt] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lineTotal = lineItemTotal(deliverable.lineItems)
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
      if (!res.ok) { setError((await res.json() as { error?: string }).error ?? "Save failed"); return }
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
      if (!res.ok) { setError((await res.json() as { error?: string }).error ?? "Failed to add"); return }
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
      <div className="flex gap-6 mb-4 p-3 bg-gray-800/50 rounded-lg text-sm">
        <div>
          <span className="text-gray-400">Approved: </span>
          <span className="font-semibold text-gray-100">
            {approved > 0 ? formatAmount(approved) : "—"}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Line items: </span>
          <span className="font-semibold text-gray-100">{formatAmount(lineTotal)}</span>
        </div>
        <div>
          <span className="text-gray-400">Balance: </span>
          <span className={`font-semibold ${over ? "text-red-400" : "text-gray-100"}`}>
            {approved > 0 ? formatAmount(balance) : "—"}
          </span>
        </div>
        {over && (
          <span className="ml-auto text-xs text-red-400 font-medium self-center">
            ⚠ Exceeds approved — re-approval needed
          </span>
        )}
      </div>

      {deliverable.lineItems.length > 0 && (
        <table className="w-full text-sm mb-3">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-2 text-left text-xs font-medium text-gray-400 uppercase">Description</th>
              <th className="py-2 text-right text-xs font-medium text-gray-400 uppercase w-36">Amount</th>
              {!isLocked && <th className="py-2 w-20" />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-700">
            {deliverable.lineItems.map((li) =>
              editingId === li.id ? (
                <tr key={li.id}>
                  <td className="py-1.5 pr-2">
                    <input
                      autoFocus
                      className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                    />
                  </td>
                  <td className="py-1.5 pr-2">
                    <input
                      type="number" min="0" step="0.01"
                      className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-right text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editAmt}
                      onChange={(e) => setEditAmt(e.target.value)}
                    />
                  </td>
                  <td className="py-1.5">
                    <div className="flex gap-1 justify-end">
                      <Button size="sm" variant="primary" onClick={() => saveEdit(li.id)} disabled={saving}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={li.id} className="group">
                  <td className="py-2 text-gray-200">{li.description}</td>
                  <td className="py-2 text-right text-gray-200 tabular-nums">{formatAmount(li.amount)}</td>
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

      {!isLocked && (
        adding ? (
          <div className="flex gap-2 mt-2">
            <input
              autoFocus
              className="flex-1 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setAdding(false) }}
            />
            <input
              type="number" min="0" step="0.01"
              className="w-32 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-right text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
  showUpload,
  onShowUpload,
  onRefresh,
}: {
  readonly deliverable: Deliverable
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly isLocked: boolean
  readonly showUpload: boolean
  readonly onShowUpload: (v: boolean) => void
  readonly onRefresh: () => Promise<void>
}) {
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState<"BUDGET" | "APPROVAL" | "DELIVERY_NOTE" | "OTHER">("BUDGET")
  const [displayName, setDisplayName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [pdfViewer, setPdfViewer] = useState<{ id: string; name: string } | null>(null)

  function applyFile(f: File) {
    setFile(f)
    setDisplayName((prev) => prev.trim() === "" ? nameFromFile(f) : prev)
  }

  const { dragging, onDragOver, onDragLeave, onDrop } = useDropZone(applyFile)

  async function handleUpload(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("displayName", displayName.trim())
      fd.append("type", docType)
      const res = await fetch(`/api/adhoc/deliverables/${deliverable.id}/documents`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) { setUploadError((await res.json() as { error?: string }).error ?? "Upload failed"); return }
      setDisplayName("")
      setFile(null)
      onShowUpload(false)
      await onRefresh()
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(docId: string) {
    setDeleteError(null)
    const res = await fetch(`/api/adhoc/documents/${docId}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json() as { error?: string }
      setDeleteError(data.error ?? "Failed to delete document")
      return
    }
    await onRefresh()
  }

  const budget = deliverable.documents.filter((d) => d.type === "BUDGET")
  const approval = deliverable.documents.filter((d) => d.type === "APPROVAL")
  const deliveryNote = deliverable.documents.filter((d) => d.type === "DELIVERY_NOTE")
  const other = deliverable.documents.filter((d) => d.type === "OTHER")

  return (
    <div>
      {deleteError && (
        <p className="text-xs text-red-400 bg-red-900/20 px-3 py-1.5 rounded-md mb-3">{deleteError}</p>
      )}

      <AdhocDocList
        docs={budget}
        label="Budget"
        downloadUrl={(id) => `/api/adhoc/documents/${id}`}
        canDelete={() => isAdmin}
        onDelete={handleDelete}
        onView={(doc) => setPdfViewer({ id: doc.id, name: doc.displayName })}
        emptyText="None uploaded"
      />
      <AdhocDocList
        docs={approval}
        label="Approval"
        downloadUrl={(id) => `/api/adhoc/documents/${id}`}
        canDelete={() => isAdmin}
        onDelete={handleDelete}
        onView={(doc) => setPdfViewer({ id: doc.id, name: doc.displayName })}
        emptyText="None uploaded"
      />
      <AdhocDocList
        docs={deliveryNote}
        label="Delivery Note"
        downloadUrl={(id) => `/api/adhoc/documents/${id}`}
        canDelete={() => isAdmin}
        onDelete={handleDelete}
        onView={(doc) => setPdfViewer({ id: doc.id, name: doc.displayName })}
      />
      <AdhocDocList
        docs={other}
        label="Other"
        downloadUrl={(id) => `/api/adhoc/documents/${id}`}
        canDelete={() => isAdmin}
        onDelete={handleDelete}
        onView={(doc) => setPdfViewer({ id: doc.id, name: doc.displayName })}
      />

      {!isLocked && (
        <div className="flex justify-end mt-2 mb-1">
          <Button variant="secondary" size="sm" onClick={() => onShowUpload(!showUpload)}>
            <Upload size={13} className="mr-1.5" />
            Upload
          </Button>
        </div>
      )}

      {showUpload && !isLocked && (
        <form
          onSubmit={handleUpload}
          className="mt-2 p-4 border border-gray-700 rounded-xl bg-gray-800/50"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-2.5 sm:w-52 shrink-0">
              <div>
                <label htmlFor="dm-doc-type" className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                <select
                  id="dm-doc-type"
                  className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-100"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as "BUDGET" | "APPROVAL" | "DELIVERY_NOTE" | "OTHER")}
                >
                  <option value="BUDGET">Budget</option>
                  <option value="APPROVAL">Approval</option>
                  <option value="DELIVERY_NOTE">Delivery Note</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="dm-doc-name" className="block text-xs font-medium text-gray-400 mb-1">Name *</label>
                <input
                  id="dm-doc-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="Display name"
                  className="w-full px-3 py-2 border border-gray-600 rounded-lg text-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-500"
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={uploading || !file}>
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { onShowUpload(false); setFile(null); setDisplayName("") }}
                >
                  Cancel
                </Button>
              </div>
            </div>

            <FileDropZone
              file={file}
              dragging={dragging}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onFile={applyFile}
              accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv"
            />
          </div>
          {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
        </form>
      )}

      {pdfViewer && (
        <PdfViewerModal
          fileUrl={`/api/adhoc/documents/${pdfViewer.id}`}
          docName={pdfViewer.name}
          onClose={() => setPdfViewer(null)}
        />
      )}
    </div>
  )
}

// ─── Approver name field ──────────────────────────────────────────────────────

function ApproverNameField({
  value,
  deliverableId,
  onSaved,
}: {
  readonly value: string | null
  readonly deliverableId: string
  readonly onSaved: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const [saving, setSaving] = useState(false)

  useEffect(() => { setDraft(value ?? "") }, [value])

  async function save() {
    setSaving(true)
    try {
      await fetch(`/api/adhoc/deliverables/${deliverableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ approverName: draft.trim() || null }),
      })
      setEditing(false)
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <p className="text-xs text-gray-400">Approver</p>
      {editing ? (
        <div className="flex items-center gap-1 mt-0.5">
          <input
            autoFocus
            className="rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { void save() }
              if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false) }
            }}
            onBlur={() => { void save() }}
          />
          {saving && <span className="text-xs text-gray-500">…</span>}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="text-sm text-gray-200 hover:text-blue-400 transition-colors mt-0.5 block text-left"
          title="Click to edit"
        >
          {value ?? <span className="text-gray-600 italic text-xs">—</span>}
        </button>
      )}
    </div>
  )
}

// ─── Milestone date field ─────────────────────────────────────────────────────

function DateField({
  label,
  value,
  deliverableId,
  field,
  nullable = true,
  onSaved,
}: {
  readonly label: string
  readonly value: string | null
  readonly deliverableId: string
  readonly field: "createdAt" | "partiallyApprovedAt" | "approvedAt" | "deliveredAt"
  readonly nullable?: boolean
  readonly onSaved: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ? value.slice(0, 10) : "")
  const [saving, setSaving] = useState(false)

  useEffect(() => { setDraft(value ? value.slice(0, 10) : "") }, [value])

  async function save() {
    if (!draft && !nullable) return
    setSaving(true)
    try {
      await fetch(`/api/adhoc/deliverables/${deliverableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: draft || null }),
      })
      setEditing(false)
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  const formatted = value
    ? new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : "—"

  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1">
          <DatePicker
            value={draft}
            onChange={setDraft}
            clearable={nullable}
            triggerClassName="text-xs border border-gray-600 bg-gray-800 text-gray-100 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center min-w-[110px]"
          />
          <button type="button" onClick={save} disabled={saving} className="text-xs text-blue-400 hover:text-blue-300 px-1">
            {saving ? "…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => { setDraft(value ? value.slice(0, 10) : ""); setEditing(false) }}
            className="text-xs text-gray-500 hover:text-gray-400"
          >
            Cancel
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => { setDraft(value ? value.slice(0, 10) : ""); setEditing(true) }}
          className="text-sm text-gray-200 hover:text-blue-400 transition-colors tabular-nums"
          title="Click to edit"
        >
          {formatted}
        </button>
      )}
    </div>
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
  const [showUpload, setShowUpload] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [revoking, setRevoking] = useState(false)
  const [editingApproval, setEditingApproval] = useState(false)
  const [approvePanelOpen, setApprovePanelOpen] = useState(false)

  const [titleDraft, setTitleDraft] = useState("")
  const [descDraft, setDescDraft] = useState("")

  const fetchDeliverable = useCallback(async () => {
    const res = await fetch(`/api/adhoc/deliverables/${deliverableId}`)
    if (res.ok) setDeliverable(await res.json())
    setLoading(false)
  }, [deliverableId])

  useEffect(() => { fetchDeliverable() }, [fetchDeliverable])

  useEffect(() => {
    if (deliverable) {
      setTitleDraft(deliverable.title)
      setDescDraft(deliverable.description ?? "")
    }
  }, [deliverable])

  useEffect(() => {
    setApprovePanelOpen(false)
    setEditingApproval(false)
  }, [deliverable?.status])

  useWindowDragExpand(() => {
    if (!approvePanelOpen) {
      setActiveTab("documents")
      setShowUpload(true)
    }
  })

  async function refresh() {
    await fetchDeliverable()
    await onRefresh()
  }

  async function saveField(title: string, description: string | null) {
    if (!deliverable) return
    const res = await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    })
    if (res.ok) await refresh()
  }

  function handleTitleBlur() {
    const trimmed = titleDraft.trim()
    if (!trimmed) { setTitleDraft(deliverable?.title ?? ""); return }
    if (trimmed !== deliverable?.title) void saveField(trimmed, deliverable?.description ?? null)
  }

  function handleDescBlur() {
    const trimmed = descDraft.trim()
    const current = deliverable?.description ?? ""
    if (trimmed !== current) void saveField(deliverable?.title ?? titleDraft, trimmed || null)
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

  async function handleRevoke() {
    if (!deliverable) return
    setRevoking(true)
    setEditingApproval(false)
    try {
      await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeApproval: true }),
      })
      await refresh()
    } finally {
      setRevoking(false)
    }
  }

  async function handleRevertDelivered() {
    if (!deliverable) return
    setTransitioning(true)
    try {
      await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "APPROVED", deliveredAt: null }),
      })
      await refresh()
    } finally {
      setTransitioning(false)
    }
  }

  const isLocked = deliverable?.status === "DELIVERED" && !isAdmin
  const canApprove = deliverable?.status === "NOT_APPROVED"
  const canEditApproval = deliverable?.status === "PARTIALLY_APPROVED" || deliverable?.status === "APPROVED"
  const canDeliver = deliverable?.status === "APPROVED"
  const canRevertDelivered = deliverable?.status === "DELIVERED"
  const missingApprovalDoc =
    canEditApproval &&
    (deliverable?.documents.filter((d) => d.type === "APPROVAL").length ?? 0) === 0

  const itemsLabel = deliverable ? `Line Items (${deliverable.lineItems.length})` : "Line Items"
  const docsLabel = deliverable ? `Documents (${deliverable.documents.length})` : "Documents"
  const tabs = [
    { key: "items" as const, label: itemsLabel },
    { key: "documents" as const, label: docsLabel },
    { key: "log" as const, label: "Log" },
  ]

  let tabContent: React.ReactNode
  if (loading) {
    tabContent = (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 bg-gray-700 rounded animate-pulse" />
        ))}
      </div>
    )
  } else if (deliverable) {
    tabContent = (
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
            showUpload={showUpload}
            onShowUpload={setShowUpload}
            onRefresh={refresh}
          />
        )}
        {activeTab === "log" && (
          <LogSection
            commentEndpoint={`/api/adhoc/deliverables/${deliverable.id}/comments`}
            entries={[
              ...deliverable.comments.map((c): LogEntry => ({
                id: c.id, content: c.content, system: c.system, createdAt: c.createdAt, author: c.author,
              })),
              ...deliverable.systemLogs.map((l): LogEntry => ({
                id: l.id, content: l.message, system: true, createdAt: l.createdAt, author: l.user,
              })),
            ]}
            currentUser={{ id: currentUserId, name: "" }}
            onRefresh={refresh}
          />
        )}
      </>
    )
  } else {
    tabContent = <p className="text-sm text-gray-400">Failed to load.</p>
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 cursor-default" onClick={onClose} />

      <div className="relative ml-auto w-full max-w-2xl h-full bg-gray-900 shadow-xl flex flex-col overflow-hidden">
        {/* Header — inline-editable title + description */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-700">
          <div className="flex-1 min-w-0 pr-4">
            {loading ? (
              <div className="h-5 w-48 bg-gray-700 rounded animate-pulse" />
            ) : (
              <>
                <textarea
                  className="w-full appearance-none bg-gray-900 focus:bg-gray-800 border-b border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none text-2xl font-semibold text-gray-100 py-0.5 leading-tight transition-colors resize-none overflow-hidden disabled:opacity-50"
                  rows={1}
                  value={titleDraft}
                  disabled={!!isLocked}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur() } }}
                />
                <div className="flex items-center justify-between mt-0.5">
                  {deliverable?.internalId
                    ? <p className="text-xs font-mono text-gray-500">{deliverable.internalId}</p>
                    : <span />
                  }
                  <p className="text-xs text-gray-500">Created by {deliverable?.createdBy.name}</p>
                </div>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-300 text-xl leading-none shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Meta bar */}
        {deliverable && (
          <div className="px-6 py-3 bg-gray-800/50 border-b border-gray-700">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-400">Status</p>
                  <span className={`inline-flex mt-0.5 px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_BADGE[deliverable.status]}`}>
                    {STATUS_LABEL[deliverable.status]}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Approved Amount</p>
                  <p className="text-sm font-semibold text-gray-100 mt-0.5">
                    {Number(deliverable.approvedAmount) > 0 ? formatAmount(deliverable.approvedAmount) : "—"}
                  </p>
                </div>
                {deliverable.status !== "NOT_APPROVED" && (
                  <ApproverNameField
                    value={deliverable.approverName}
                    deliverableId={deliverable.id}
                    onSaved={refresh}
                  />
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canApprove && !approvePanelOpen && (
                  <Button size="sm" variant="outline" onClick={() => setApprovePanelOpen(true)}>Approve</Button>
                )}
                {canEditApproval && !editingApproval && (
                  <Button size="sm" variant="ghost" onClick={() => setEditingApproval(true)}>Edit Approval</Button>
                )}
                {canEditApproval && !editingApproval && (
                  <Button size="sm" variant="ghost" onClick={handleRevoke} disabled={revoking}>
                    {revoking ? "Revoking…" : "Revoke Approval"}
                  </Button>
                )}
                {canDeliver && (
                  <Button size="sm" variant="outline" onClick={() => handleTransition("DELIVERED")} disabled={transitioning}>
                    {transitioning ? "Saving…" : "Mark Delivered"}
                  </Button>
                )}
                {canRevertDelivered && (
                  <Button size="sm" variant="ghost" onClick={handleRevertDelivered} disabled={transitioning}>
                    {transitioning ? "Saving…" : "Revert to Approved"}
                  </Button>
                )}
              </div>
            </div>

            {/* Milestone dates */}
            <div className="flex flex-wrap gap-6 mt-3 pt-3 border-t border-gray-700/60">
              <DateField label="Created" value={deliverable.createdAt} deliverableId={deliverable.id} field="createdAt" nullable={false} onSaved={refresh} />
              <DateField label="Partially Approved" value={deliverable.partiallyApprovedAt} deliverableId={deliverable.id} field="partiallyApprovedAt" onSaved={refresh} />
              <DateField label="Approved" value={deliverable.approvedAt} deliverableId={deliverable.id} field="approvedAt" onSaved={refresh} />
              <DateField label="Delivered" value={deliverable.deliveredAt} deliverableId={deliverable.id} field="deliveredAt" onSaved={refresh} />
            </div>

            {missingApprovalDoc && !editingApproval && (
              <p className="mt-2 text-xs text-amber-400 bg-amber-900/20 px-3 py-1.5 rounded-md">
                ⚠ No approval document uploaded
              </p>
            )}

            {!isLocked && canApprove && approvePanelOpen && (
              <ApproveForm deliverable={deliverable} onDone={refresh} onClose={() => setApprovePanelOpen(false)} />
            )}

            {canEditApproval && editingApproval && (
              <ApprovalEditPanel
                deliverable={deliverable}
                onDone={refresh}
                onClose={() => setEditingApproval(false)}
              />
            )}
          </div>
        )}

        {/* Description */}
        {deliverable && (
          <div className="px-6 py-3 border-b border-gray-700">
            <textarea
              className="w-full appearance-none bg-gray-900 focus:bg-gray-800 border border-transparent hover:border-gray-600 focus:border-blue-500 focus:outline-none text-sm text-gray-300 rounded px-1.5 py-1 resize-none transition-colors disabled:opacity-50 placeholder:text-gray-600"
              rows={3}
              placeholder={isLocked ? "" : "Add description…"}
              value={descDraft}
              disabled={!!isLocked}
              onChange={(e) => setDescDraft(e.target.value)}
              onBlur={handleDescBlur}
              onKeyDown={(e) => { if (e.key === "Escape") setDescDraft(deliverable.description ?? "") }}
            />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-700 px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={[
                "px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors",
                activeTab === t.key
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-gray-400 hover:text-gray-300",
              ].join(" ")}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {tabContent}
        </div>
      </div>
    </div>
  )
}
