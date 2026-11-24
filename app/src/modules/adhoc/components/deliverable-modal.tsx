"use client"

import { ClientWorkLink } from "@/shared/components/clients/client-work-link"

import { useState, useEffect, useCallback, useRef } from "react"
import { Upload, X } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FileViewerModals } from "@/shared/components/ui/file-viewer-modals"
import { useFileViewer } from "@/shared/lib/use-file-viewer"
import { LogSection, type LogEntry } from "@/shared/components/ui/log-section"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { cn, formatAmount, nameFromFile, todayISO } from "@/shared/lib/utils"
import { useDropZone, useWindowDragExpand } from "@/shared/lib/use-drop-zone"
import { useAutoFocus } from "@/shared/lib/use-autofocus"
import { FileDropZone } from "@/shared/components/ui/file-drop-zone"
import { FormField } from "@/shared/components/ui/form-field"
import { FORM_INPUT_CLS, FORM_TEXTAREA_CLS } from "@/shared/components/ui/form-styles"
import { AdhocDocList } from "./adhoc-doc-list"
import { DELIVERABLE_STATUS_BADGE as STATUS_BADGE } from "../constants"

// ─── Types ────────────────────────────────────────────────────────────────────

type LineItem = {
  id: string
  description: string
  amount: string
}

type AdhocDocType = "BUDGET" | "APPROVAL" | "DELIVERY_NOTE" | "WORK_REPORT" | "OTHER"

type AdhocDoc = {
  id: string
  displayName: string
  originalName: string
  mimeType: string
  size: number
  type: AdhocDocType
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
  isArchived: boolean
  id: string
  internalId: string | null
  title: string
  description: string | null
  approvedAmount: string
  approverName: string | null
  deliveryNoteRef: string | null
  poInvoiceReference: string | null
  inventoryIssueOutDate: string | null
  financeAmount: string | null
  customer: string | null
  clientId: string | null
  clientActivity: LogEntry[]
  canManageClient: boolean
  status: "NOT_APPROVED" | "PARTIALLY_APPROVED" | "APPROVED" | "DELIVERED" | "CLOSED_FINANCE" | "CANCELLED"
  partiallyApprovedAt: string | null
  approvedAt: string | null
  deliveredAt: string | null
  closedFinanceAt: string | null
  closedFinanceNote: string | null
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
  CLOSED_FINANCE: "Closed Finance",
  CANCELLED: "Cancelled",
}

const ADHOC_DOC_TYPE_OPTIONS: { value: AdhocDocType; label: string }[] = [
  { value: "BUDGET", label: "Budget" },
  { value: "APPROVAL", label: "Approval" },
  { value: "DELIVERY_NOTE", label: "Delivery Note" },
  { value: "WORK_REPORT", label: "Work Report" },
  { value: "OTHER", label: "Other" },
]

/** Statuses that only admins may edit further (mirrors the API's lock). */
const LOCKED_STATUSES = ["CLOSED_FINANCE"]

/** Statuses from which a work package can still be cancelled (not yet delivered). */
const CANCELLABLE_STATUSES = ["NOT_APPROVED", "PARTIALLY_APPROVED", "APPROVED"]

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
  const [approverName, setApproverName] = useState(deliverable.approverName ?? "")
  const [displayName, setDisplayName] = useState("")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [docFile, setDocFile] = useState<File | null>(null)
  const amountRef = useAutoFocus<HTMLInputElement>()

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
    } catch {
      setError("The request failed. Please check your connection and try again.")
    } finally {
      setSaving(false)
      setUploading(false)
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
              ref={amountRef}
              type="number"
              min="0"
              step="0.01"
              className="w-36 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-right text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") void handleApprove() }}
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
              onKeyDown={(e) => { if (e.key === "Enter") void handleApprove() }}
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
  const amountRef = useAutoFocus<HTMLInputElement>()

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
    } catch {
      setError("The request failed. Please check your connection and try again.")
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
    } catch {
      setError("The request failed. Please check your connection and try again.")
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
          ref={amountRef}
          type="number"
          min="0"
          step="0.01"
          className="w-36 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-right text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") void handleUpdate() }}
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
  const editDescRef = useAutoFocus<HTMLInputElement>()
  const newDescRef = useAutoFocus<HTMLInputElement>()

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
    } catch {
      setError("The request failed. Please check your connection and try again.")
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
    } catch {
      setError("The request failed. Please check your connection and try again.")
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
                      ref={editDescRef}
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
              ref={newDescRef}
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
              onKeyDown={(e) => { if (e.key === "Enter") void addItem() }}
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
  isAdmin,
  isLocked,
  initialDocumentType,
  showUpload,
  onShowUpload,
  onRefresh,
}: {
  readonly deliverable: Deliverable
  readonly isAdmin: boolean
  readonly isLocked: boolean
  readonly initialDocumentType: AdhocDocType
  readonly showUpload: boolean
  readonly onShowUpload: (v: boolean) => void
  readonly onRefresh: () => Promise<void>
}) {
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState<AdhocDocType>(initialDocumentType)
  const [displayName, setDisplayName] = useState("")
  const [dnRef, setDnRef] = useState("")
  const [approverName, setApproverName] = useState(deliverable.approverName ?? "")
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const viewers = useFileViewer()

  useEffect(() => { setApproverName(deliverable.approverName ?? "") }, [deliverable.approverName])

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
      if (docType === "DELIVERY_NOTE" && dnRef.trim()) {
        await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryNoteRef: dnRef.trim() }),
        })
      }
      if (docType === "APPROVAL" && approverName.trim()) {
        await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ approverName: approverName.trim() }),
        })
      }
      setDisplayName("")
      setDnRef("")
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

  const editProps = isLocked
    ? {}
    : { editUrl: (id: string) => `/api/adhoc/documents/${id}`, editTypeOptions: ADHOC_DOC_TYPE_OPTIONS, onEdited: onRefresh }

  const budget = deliverable.documents.filter((d) => d.type === "BUDGET")
  const approval = deliverable.documents.filter((d) => d.type === "APPROVAL")
  const deliveryNote = deliverable.documents.filter((d) => d.type === "DELIVERY_NOTE")
  const workReport = deliverable.documents.filter((d) => d.type === "WORK_REPORT")
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
        onView={viewers.openViewer}
        {...editProps}
        emptyText="None uploaded"
      />
      <AdhocDocList
        docs={approval}
        label="Approval"
        downloadUrl={(id) => `/api/adhoc/documents/${id}`}
        canDelete={() => isAdmin}
        onDelete={handleDelete}
        onView={viewers.openViewer}
        {...editProps}
        emptyText="None uploaded"
      />
      <AdhocDocList
        docs={deliveryNote}
        label="Delivery Note"
        downloadUrl={(id) => `/api/adhoc/documents/${id}`}
        canDelete={() => isAdmin}
        onDelete={handleDelete}
        onView={viewers.openViewer}
        {...editProps}
      />
      <AdhocDocList
        docs={workReport}
        label="Work Report"
        downloadUrl={(id) => `/api/adhoc/documents/${id}`}
        canDelete={() => isAdmin}
        onDelete={handleDelete}
        onView={viewers.openViewer}
        {...editProps}
      />
      <AdhocDocList
        docs={other}
        label="Other"
        downloadUrl={(id) => `/api/adhoc/documents/${id}`}
        canDelete={() => isAdmin}
        onDelete={handleDelete}
        onView={viewers.openViewer}
        {...editProps}
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
                  onChange={(e) => setDocType(e.target.value as AdhocDocType)}
                >
                  {ADHOC_DOC_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>
              {docType === "APPROVAL" && (
                <div>
                  <label htmlFor="dm-approver" className="block text-xs font-medium text-gray-400 mb-1">
                    Approver <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                  <input
                    id="dm-approver"
                    value={approverName}
                    onChange={(e) => setApproverName(e.target.value)}
                    placeholder="Approver name"
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg text-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                </div>
              )}
              {docType === "DELIVERY_NOTE" && (
                <div>
                  <label htmlFor="dm-dn-ref" className="block text-xs font-medium text-gray-400 mb-1">
                    DN Ref. <span className="font-normal text-gray-500">(optional)</span>
                  </label>
                  <input
                    id="dm-dn-ref"
                    value={dnRef}
                    onChange={(e) => setDnRef(e.target.value)}
                    placeholder="BT-XXXXXXXXXX"
                    className="w-full px-3 py-2 border border-gray-600 rounded-lg text-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                </div>
              )}
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
                  onClick={() => { onShowUpload(false); setFile(null); setDisplayName(""); setDnRef(""); setApproverName(deliverable.approverName ?? "") }}
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

      <FileViewerModals viewers={viewers} urlFor={(id) => `/api/adhoc/documents/${id}`} />
    </div>
  )
}

// ─── Editable text field ─────────────────────────────────────────────────────

function EditableTextField({
  label,
  fieldName,
  value,
  deliverableId,
  isReadOnly = false,
  placeholder,
  onSaved,
}: {
  readonly label: string
  readonly fieldName: "approverName" | "deliveryNoteRef" | "closedFinanceNote" | "poInvoiceReference"
  readonly value: string | null
  readonly deliverableId: string
  readonly isReadOnly?: boolean
  readonly placeholder?: string
  readonly onSaved: () => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const [saving, setSaving] = useState(false)
  const draftRef = useAutoFocus<HTMLInputElement>()

  useEffect(() => { setDraft(value ?? "") }, [value])

  async function save() {
    setSaving(true)
    try {
      await fetch(`/api/adhoc/deliverables/${deliverableId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [fieldName]: draft.trim() || null }),
      })
      setEditing(false)
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  const displayValue = value ?? <span className="text-gray-600 italic text-xs">—</span>
  const viewEl = isReadOnly
    ? <p className="text-sm text-gray-200 mt-0.5">{displayValue}</p>
    : (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-sm text-gray-200 hover:text-blue-400 transition-colors mt-0.5 block text-left"
        title="Click to edit"
      >
        {displayValue}
      </button>
    )

  return (
    <div>
      <p className="text-xs text-gray-400">{label}</p>
      {editing ? (
        <div className="flex items-center gap-1 mt-0.5">
          <input
            ref={draftRef}
            className="rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-36"
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { void save() }
              if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false) }
            }}
            onBlur={() => { void save() }}
          />
          {saving && <span className="text-xs text-gray-500">…</span>}
        </div>
      ) : viewEl}
    </div>
  )
}

// ─── Deliver panel ────────────────────────────────────────────────────────────

function DeliverPanel({
  deliverable,
  onDone,
  onClose,
}: {
  readonly deliverable: Deliverable
  readonly onDone: () => Promise<void>
  readonly onClose: () => void
}) {
  const hasDeliveryNote = deliverable.documents.some((d) => d.type === "DELIVERY_NOTE")
  const [dnRef, setDnRef] = useState(deliverable.deliveryNoteRef ?? "")
  const [displayName, setDisplayName] = useState("")
  const [docFile, setDocFile] = useState<File | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dnInputRef = useAutoFocus<HTMLInputElement>()

  function applyFile(f: File) {
    setDocFile(f)
    setDisplayName((prev) => prev.trim() === "" ? nameFromFile(f) : prev)
  }

  const { dragging, onDragOver, onDragLeave, onDrop } = useDropZone(applyFile)

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      if (docFile) {
        if (!displayName.trim()) { setError("Please enter a display name for the document"); setSaving(false); return }
        setUploading(true)
        const fd = new FormData()
        fd.append("file", docFile)
        fd.append("displayName", displayName.trim())
        fd.append("type", "DELIVERY_NOTE")
        const upRes = await fetch(`/api/adhoc/deliverables/${deliverable.id}/documents`, { method: "POST", body: fd })
        setUploading(false)
        if (!upRes.ok) { setError((await upRes.json() as { error?: string }).error ?? "Upload failed"); return }
      }
      const res = await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "DELIVERED", deliveryNoteRef: dnRef.trim() || null }),
      })
      if (!res.ok) { setError((await res.json() as { error?: string }).error ?? "Save failed"); return }
      onClose()
      await onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
      <div className="flex flex-wrap gap-3 items-start">
        <div>
          <label htmlFor="deliver-dnref" className="block text-xs text-gray-400 mb-1">
            DN Ref. <span className="text-gray-600">(optional)</span>
          </label>
          <input
            id="deliver-dnref"
            ref={dnInputRef}
            type="text"
            className="w-44 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="BT-XXXXXXXXXX"
            value={dnRef}
            onChange={(e) => setDnRef(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleConfirm() }}
          />
        </div>
        <div className="flex-1 min-w-60">
          {hasDeliveryNote && (
            <div className="mb-2 px-2.5 py-2 bg-green-900/20 border border-green-800/60 rounded-lg">
              <p className="text-xs font-medium text-green-400 mb-1">Delivery note already uploaded</p>
              <ul className="space-y-0.5">
                {deliverable.documents.filter((d) => d.type === "DELIVERY_NOTE").map((doc) => (
                  <li key={doc.id} className="text-xs text-green-300">✓ {doc.displayName}</li>
                ))}
              </ul>
            </div>
          )}
          <p className="text-xs text-gray-400 mb-1">
            {hasDeliveryNote
              ? "Upload additional delivery note"
              : <>Delivery Note Document <span className="font-normal text-gray-500">(optional)</span></>
            }
          </p>
          <div className="mb-2">
            <input
              className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={() => void handleConfirm()} disabled={saving || uploading}>
          {saving ? "Saving…" : "Confirm Delivery"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── Close Finance panel ──────────────────────────────────────────────────────

function ClosedFinancePanel({
  deliverable,
  onDone,
  onClose,
}: {
  readonly deliverable: Deliverable
  readonly onDone: () => Promise<void>
  readonly onClose: () => void
}) {
  const [date, setDate] = useState(todayISO())
  const [note, setNote] = useState(deliverable.closedFinanceNote ?? "")
  const [amount, setAmount] = useState(String(Number(deliverable.approvedAmount)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const amountValid = amount !== "" && !Number.isNaN(Number(amount)) && Number(amount) >= 0

  async function handleConfirm() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "CLOSED_FINANCE",
          closedFinanceAt: date,
          closedFinanceNote: note.trim() || null,
          financeAmount: Number(amount),
        }),
      })
      if (!res.ok) { setError((await res.json() as { error?: string }).error ?? "Save failed"); return }
      onClose()
      await onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-gray-700 space-y-3">
      <div className="flex flex-wrap gap-3 items-start">
        <div>
          <label htmlFor="close-finance-date" className="block text-xs text-gray-400 mb-1">Date *</label>
          <DatePicker
            value={date}
            onChange={setDate}
            clearable={false}
            triggerClassName="text-sm border border-gray-600 bg-gray-800 text-gray-100 rounded px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center min-w-[140px]"
          />
        </div>
        <div>
          <label htmlFor="close-finance-amount" className="block text-xs text-gray-400 mb-1">
            Final Amount * <span className="text-gray-600">(defaults to approved)</span>
          </label>
          <input
            id="close-finance-amount"
            type="number"
            min="0"
            step="0.01"
            className="w-36 rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-right text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="flex-1 min-w-60">
          <label htmlFor="close-finance-note" className="block text-xs text-gray-400 mb-1">
            Note <span className="text-gray-600">(optional)</span>
          </label>
          <textarea
            id="close-finance-note"
            rows={2}
            className="w-full rounded border border-gray-600 bg-gray-800 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button size="sm" variant="primary" onClick={() => void handleConfirm()} disabled={saving || !date || !amountValid}>
          {saving ? "Saving…" : "Confirm Close"}
        </Button>
        <Button size="sm" variant="ghost" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  )
}

// ─── Finance amount (editable after closing) ─────────────────────────────────

function FinanceAmountField({
  deliverable,
  isReadOnly,
  onSaved,
}: {
  readonly deliverable: Deliverable
  readonly isReadOnly: boolean
  readonly onSaved: () => Promise<void>
}) {
  const current = deliverable.financeAmount ?? deliverable.approvedAmount
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(Number(current)))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const draftRef = useAutoFocus<HTMLInputElement>()

  useEffect(() => { setDraft(String(Number(current))) }, [current])

  async function save() {
    if (draft === "" || Number.isNaN(Number(draft)) || Number(draft) < 0) {
      setError("Enter 0 or more")
      return
    }
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ financeAmount: Number(draft) }),
      })
      if (!res.ok) { setError((await res.json() as { error?: string }).error ?? "Save failed"); return }
      setEditing(false)
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  if (editing) {
    return (
      <div>
        <p className="text-xs text-gray-400">Finance Amount</p>
        <div className="flex items-center gap-1 mt-0.5">
          <input
            ref={draftRef}
            type="number"
            min="0"
            step="0.01"
            className="rounded border border-gray-600 bg-gray-800 px-1.5 py-0.5 text-sm text-right text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 w-28"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void save()
              if (e.key === "Escape") setEditing(false)
            }}
          />
          <button type="button" onClick={() => void save()} disabled={saving} className="text-xs text-blue-400 hover:text-blue-300 px-1">
            {saving ? "…" : "Save"}
          </button>
          <button type="button" onClick={() => { setDraft(String(Number(current))); setError(null); setEditing(false) }} className="text-xs text-gray-500 hover:text-gray-400">
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-0.5">{error}</p>}
      </div>
    )
  }

  return (
    <div>
      <p className="text-xs text-gray-400">Finance Amount</p>
      {isReadOnly ? (
        <p className="text-sm font-semibold text-gray-100 mt-0.5">{formatAmount(current)}</p>
      ) : (
        <button type="button" onClick={() => setEditing(true)} className="text-sm font-semibold text-gray-100 hover:text-blue-400 transition-colors mt-0.5 block" title="Click to edit">
          {formatAmount(current)}
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
  isReadOnly = false,
  onSaved,
}: {
  readonly label: string
  readonly value: string | null
  readonly deliverableId: string
  readonly field: "createdAt" | "partiallyApprovedAt" | "approvedAt" | "deliveredAt" | "closedFinanceAt" | "inventoryIssueOutDate"
  readonly nullable?: boolean
  readonly isReadOnly?: boolean
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

  const viewEl = isReadOnly
    ? <span className="text-sm text-gray-200 tabular-nums">{formatted}</span>
    : (
      <button
        type="button"
        onClick={() => { setDraft(value ? value.slice(0, 10) : ""); setEditing(true) }}
        className="text-sm text-gray-200 hover:text-blue-400 transition-colors tabular-nums"
        title="Click to edit"
      >
        {formatted}
      </button>
    )

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
      ) : viewEl}
    </div>
  )
}

// ─── Tab content ─────────────────────────────────────────────────────────────

type TabContentProps = {
  readonly loading: boolean
  readonly deliverable: Deliverable | null
  readonly activeTab: PackageTab
  readonly initialDocumentType: AdhocDocType
  readonly showUpload: boolean
  readonly onShowUpload: (v: boolean) => void
  readonly onRefresh: () => Promise<void>
  readonly isAdmin: boolean
  readonly isLocked: boolean
  readonly isReadOnly: boolean
}

function DeliverableTabContent({ loading, deliverable, activeTab, initialDocumentType, showUpload, onShowUpload, onRefresh, isAdmin, isLocked, isReadOnly }: TabContentProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 bg-gray-700 rounded animate-pulse" />
        ))}
      </div>
    )
  }
  if (!deliverable) return <p className="text-sm text-gray-400">Failed to load.</p>
  return (
    <>
      {activeTab === "items" && (
        <LineItemsTab deliverable={deliverable} isLocked={isLocked} onRefresh={onRefresh} />
      )}
      {activeTab === "documents" && (
        <DocumentsTab
          deliverable={deliverable}
          isAdmin={isAdmin}
          isLocked={isLocked}
          initialDocumentType={initialDocumentType}
          showUpload={showUpload}
          onShowUpload={onShowUpload}
          onRefresh={onRefresh}
        />
      )}
      {activeTab === "log" && (
        <LogSection
          commentEndpoint={`/api/adhoc/deliverables/${deliverable.id}/comments`}
          entries={[
            ...deliverable.comments.map((c): LogEntry => ({
              id: c.id, content: c.content, system: c.system, createdAt: c.createdAt, author: c.author,
              ...(!c.system && { source: { label: `Ad Hoc package · ${deliverable.internalId ?? deliverable.title}` } }),
            })),
            ...deliverable.clientActivity,
            ...deliverable.systemLogs.map((l): LogEntry => ({
              id: l.id, content: l.message, system: true, createdAt: l.createdAt, author: l.user,
            })),
          ]}
          isReadOnly={isReadOnly}
          onRefresh={onRefresh}
        />
      )}
    </>
  )
}

const OVERVIEW_SECTION = "space-y-3 rounded-xl border border-gray-700 bg-gray-800/50 p-4"
const OVERVIEW_HEADING = "text-sm font-semibold text-gray-100"

type PackageTab = "overview" | "items" | "documents" | "log"
type WorkflowPanel = "approve" | "editApproval" | "deliver" | "finance"
type PackageAction = {
  label: string
  consequence: string
  payload: Record<string, unknown>
  destructive?: boolean
}

const NEXT_STEP: Partial<Record<string, { label: string; panel: WorkflowPanel }>> = {
  NOT_APPROVED: { label: "Approve package", panel: "approve" },
  PARTIALLY_APPROVED: { label: "Update approval", panel: "editApproval" },
  APPROVED: { label: "Mark delivered", panel: "deliver" },
  DELIVERED: { label: "Close finance", panel: "finance" },
}

function packageActions(deliverable: Deliverable): PackageAction[] {
  const { status, isArchived } = deliverable
  const actions: PackageAction[] = []
  if (!isArchived) {
    if (status === "PARTIALLY_APPROVED" || status === "APPROVED") actions.push({
      label: "Revoke approval", consequence: "Move to Not Approved and clear the approval amount and dates.",
      payload: { removeApproval: true }, destructive: true,
    })
    if (status === "DELIVERED") actions.push({
      label: "Revert to approved", consequence: "Move to Approved and clear the delivered date.",
      payload: { status: "APPROVED", deliveredAt: null }, destructive: true,
    })
    if (status === "CLOSED_FINANCE") actions.push({
      label: "Revert to delivered", consequence: "Move to Delivered and clear the finance close date and final amount.",
      payload: { status: "DELIVERED", closedFinanceAt: null }, destructive: true,
    })
    if (CANCELLABLE_STATUSES.includes(status)) actions.push({
      label: "Cancel package", consequence: "Move to Cancelled. The package will be hidden from the default list and its approved amount will no longer count against the agreement.",
      payload: { status: "CANCELLED" }, destructive: true,
    })
  }
  actions.push({
    label: isArchived ? "Unarchive" : "Archive",
    consequence: isArchived ? `Return this package to the active list at ${STATUS_LABEL[status]}.`
      : `Hide this package from the active list. Its workflow stage remains ${STATUS_LABEL[status]}.`,
    payload: { isArchived: !isArchived },
  })
  return actions
}

function PackageActionsMenu({ actions, onSelect, disabled }: {
  readonly actions: PackageAction[]
  readonly onSelect: (action: PackageAction) => void
  readonly disabled: boolean
}) {
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function closeOnOutsideClick(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener("pointerdown", closeOnOutsideClick)
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick)
  }, [open])

  if (!actions.length) return null

  return (
    <div ref={menuRef} className="relative"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !open) return
        event.stopPropagation()
        setOpen(false)
        event.currentTarget.querySelector("button")?.focus()
      }}>
      <Button size="sm" variant="secondary" disabled={disabled} aria-expanded={open} onClick={() => setOpen(!open)}>
        More actions
      </Button>
      {open && !disabled && (
        <div className="absolute right-0 z-20 mt-1 w-48 rounded-lg border border-gray-600 bg-gray-800 p-1 shadow-lg">
          {actions.map((action) => (
            <button key={action.label} type="button"
              className={cn("block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-gray-700",
                action.destructive ? "text-red-300" : "text-gray-200")}
              onClick={() => { setOpen(false); onSelect(action) }}>
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

type Props = {
  readonly deliverableId: string
  readonly isAdmin: boolean
  readonly isReadOnly?: boolean
  readonly onClose: () => void
  readonly onRefresh: () => Promise<void>
}

function countLabel(label: string, count: number | undefined) {
  return count === undefined ? label : `${label} (${count})`
}

export function DeliverableModal({ deliverableId, isAdmin, isReadOnly: accessReadOnly = false, onClose, onRefresh }: Props) {
  const [deliverable, setDeliverable] = useState<Deliverable | null>(null)
  const isReadOnly = accessReadOnly || !!deliverable?.isArchived
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<PackageTab>("overview")
  const [initialDocumentType, setInitialDocumentType] = useState<AdhocDocType>("BUDGET")
  const bodyRef = useRef<HTMLDivElement>(null)
  const [showUpload, setShowUpload] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [panel, setPanel] = useState<WorkflowPanel | null>(null)
  const [pendingAction, setPendingAction] = useState<PackageAction | null>(null)
  const [actionError, setActionError] = useState("")

  const [titleDraft, setTitleDraft] = useState("")
  const [descDraft, setDescDraft] = useState("")
  const [customerDraft, setCustomerDraft] = useState("")

  const fetchDeliverable = useCallback(async () => {
    try {
      const res = await fetch(`/api/adhoc/deliverables/${deliverableId}`)
      if (res.ok) setDeliverable(await res.json())
    } finally {
      setLoading(false)
    }
  }, [deliverableId])

  useEffect(() => {
    void fetchDeliverable().catch(() => setDeliverable(null))
  }, [fetchDeliverable])

  useEffect(() => {
    if (deliverable) {
      setTitleDraft(deliverable.title)
      setDescDraft(deliverable.description ?? "")
      setCustomerDraft(deliverable.customer ?? "")
    }
  }, [deliverable])

  useEffect(() => {
    setPanel(null)
    setPendingAction(null)
    setActionError("")
  }, [deliverable?.status, deliverable?.isArchived])

  useWindowDragExpand(() => {
    if (!isReadOnly && deliverable && (isAdmin || deliverable.status !== "CLOSED_FINANCE") && !panel && !pendingAction) {
      if (activeTab !== "documents") setInitialDocumentType("BUDGET")
      setActiveTab("documents")
      setShowUpload(true)
    }
  })

  async function refresh() {
    await fetchDeliverable()
    await onRefresh()
  }

  function scrollBodyToTop() {
    bodyRef.current?.scrollTo({ top: 0 })
  }

  function openApprovalUpload() {
    setInitialDocumentType("APPROVAL")
    setShowUpload(true)
    setActiveTab("documents")
    scrollBodyToTop()
  }

  async function closePanelAndRefresh() {
    await refresh()
    setPanel(null)
  }

  async function saveFields(fields: { title?: string; description?: string | null; customer?: string | null }) {
    if (!deliverable || isLocked) return
    const res = await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fields),
    })
    if (res.ok) await refresh()
  }

  function handleTitleBlur() {
    const trimmed = titleDraft.trim()
    if (!trimmed) { setTitleDraft(deliverable?.title ?? ""); return }
    if (trimmed !== deliverable?.title) void saveFields({ title: trimmed })
  }

  function handleDescBlur() {
    const trimmed = descDraft.trim()
    if (trimmed !== (deliverable?.description ?? "")) void saveFields({ description: trimmed || null })
  }

  function handleCustomerBlur() {
    if (deliverable?.clientId) return
    const trimmed = customerDraft.trim()
    if (trimmed !== (deliverable?.customer ?? "")) void saveFields({ customer: trimmed || null })
  }

  async function applyPackageAction() {
    if (!deliverable || !pendingAction) return
    setTransitioning(true)
    setActionError("")
    try {
      const response = await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(pendingAction.payload),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setActionError(data.error ?? "Could not update the package.")
        return
      }
      setPendingAction(null)
      await refresh()
    } catch {
      setActionError("Could not reach the portal. Refresh the package before retrying.")
    } finally {
      setTransitioning(false)
    }
  }

  const isLocked = (LOCKED_STATUSES.includes(deliverable?.status ?? "") && !isAdmin) || isReadOnly
  const nextStep = deliverable && !isReadOnly ? NEXT_STEP[deliverable.status] : undefined
  const actions = deliverable && !accessReadOnly ? packageActions(deliverable) : []
  const hasApproval = deliverable?.status === "PARTIALLY_APPROVED" || deliverable?.status === "APPROVED"
  const missingApprovalDoc = hasApproval && !deliverable?.documents.some((doc) => doc.type === "APPROVAL")
  const showDeliveryFinance = deliverable?.status === "DELIVERED" || deliverable?.status === "CLOSED_FINANCE"

  const tabs = [
    { key: "overview", label: "Overview" },
    { key: "items", label: countLabel("Line items", deliverable?.lineItems.length) },
    { key: "documents", label: countLabel("Documents", deliverable?.documents.length) },
    { key: "log", label: "Activity" },
  ] as const

  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 cursor-default" onClick={onClose} />

      <div className="relative ml-auto w-full max-w-2xl h-full bg-gray-900 shadow-xl flex flex-col overflow-hidden">
        <header className="shrink-0 border-b border-gray-700 px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 flex-1 basis-48">
              {loading && <div className="h-5 w-40 animate-pulse rounded bg-gray-700" />}
              {deliverable && (
                <>
                  <textarea aria-label="Package title" rows={1} value={titleDraft} disabled={isLocked}
                    onChange={(event) => setTitleDraft(event.target.value)}
                    onBlur={handleTitleBlur}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") { event.preventDefault(); event.currentTarget.blur() }
                    }}
                    className="w-full resize-none rounded bg-transparent px-1 text-xl font-semibold leading-tight text-gray-100 focus:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-blue-500" />
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                    {deliverable.internalId && <span className="font-mono text-gray-400">{deliverable.internalId}</span>}
                    <span className={`rounded-full px-2 py-0.5 font-medium ${STATUS_BADGE[deliverable.status]}`}>{STATUS_LABEL[deliverable.status]}</span>
                    {deliverable.isArchived && <span className="rounded-full bg-gray-700 px-2 py-0.5 text-gray-200">Archived</span>}
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {nextStep && (
                <Button size="sm" disabled={!!panel || !!pendingAction}
                  onClick={() => { setPanel(nextStep.panel); scrollBodyToTop() }}>{nextStep.label}</Button>
              )}
              <PackageActionsMenu actions={actions} disabled={!!panel || !!pendingAction}
                onSelect={(action) => { setPendingAction(action); setActionError(""); scrollBodyToTop() }} />
              <button type="button" aria-label="Close package" onClick={onClose}
                className="rounded p-2 text-gray-400 hover:bg-gray-800 hover:text-gray-100"><X size={17} /></button>
            </div>
          </div>
        </header>

        <nav aria-label="Package sections" className="flex shrink-0 gap-1 overflow-x-auto border-b border-gray-700 px-3 sm:px-6">
          {tabs.map((tab) => (
            <button key={tab.key} type="button" aria-pressed={activeTab === tab.key}
              onClick={() => {
                if (tab.key === "documents" && activeTab !== "documents") setInitialDocumentType("BUDGET")
                setActiveTab(tab.key)
                scrollBodyToTop()
              }}
              className={cn("shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium",
                activeTab === tab.key ? "border-blue-500 text-blue-400" : "border-transparent text-gray-400 hover:text-gray-100")}>
              {tab.label}
            </button>
          ))}
        </nav>

        <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {pendingAction && !accessReadOnly && (
            <section className="mb-4 space-y-3 rounded-lg border border-gray-600 bg-gray-800 p-3" aria-label="Confirm package action">
              <h2 className="text-sm font-semibold text-gray-100">{pendingAction.label}?</h2>
              <p className="text-sm text-gray-300">{pendingAction.consequence}</p>
              {actionError && <p role="alert" className="text-sm text-red-300">{actionError}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant={pendingAction.destructive ? "danger" : "secondary"} disabled={transitioning}
                  onClick={() => void applyPackageAction()}>{transitioning ? "Saving…" : pendingAction.label}</Button>
                <Button size="sm" variant="ghost" className="text-gray-300 hover:bg-gray-700" disabled={transitioning}
                  onClick={() => setPendingAction(null)}>Keep package as is</Button>
              </div>
            </section>
          )}
          {deliverable && panel && !isReadOnly && (
            <div className="mb-4 rounded-lg border border-gray-700 bg-gray-800/60 p-3">
              {panel === "approve" && <ApproveForm deliverable={deliverable} onDone={closePanelAndRefresh} onClose={() => setPanel(null)} />}
              {panel === "editApproval" && <ApprovalEditPanel deliverable={deliverable} onDone={closePanelAndRefresh} onClose={() => setPanel(null)} />}
              {panel === "deliver" && <DeliverPanel deliverable={deliverable} onDone={closePanelAndRefresh} onClose={() => setPanel(null)} />}
              {panel === "finance" && <ClosedFinancePanel deliverable={deliverable} onDone={closePanelAndRefresh} onClose={() => setPanel(null)} />}
            </div>
          )}

          {activeTab === "overview" && deliverable && (
            <div className="space-y-4">
              <section className={OVERVIEW_SECTION}>
                <h2 className={OVERVIEW_HEADING}>Package details</h2>
                <FormField label="Customer">
                  <input aria-label="Customer" className={FORM_INPUT_CLS}
                    placeholder={isLocked ? "" : "Customer name"} value={customerDraft}
                    readOnly={isLocked || !!deliverable.clientId} onChange={(event) => setCustomerDraft(event.target.value)}
                    onBlur={handleCustomerBlur} onKeyDown={(event) => {
                      if (event.key === "Enter") event.currentTarget.blur()
                      if (event.key === "Escape") setCustomerDraft(deliverable.customer ?? "")
                    }} />
                  {deliverable.canManageClient && <ClientWorkLink kind="adhoc" workId={deliverable.id} linked={!!deliverable.clientId} />}
                </FormField>
                <FormField label="Description">
                  <textarea aria-label="Description" className={FORM_TEXTAREA_CLS} rows={3}
                    value={descDraft} readOnly={isLocked} onChange={(event) => setDescDraft(event.target.value)}
                    onBlur={handleDescBlur} onKeyDown={(event) => {
                      if (event.key === "Escape") setDescDraft(deliverable.description ?? "")
                    }} />
                </FormField>
                <p className="text-xs text-gray-400">Created by {deliverable.createdBy.name}</p>
              </section>

              <section className={OVERVIEW_SECTION}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className={OVERVIEW_HEADING}>Approval</h2>
                  {deliverable.status === "APPROVED" && !isLocked && !panel && !pendingAction && (
                    <Button size="sm" variant="secondary"
                      onClick={() => { setPanel("editApproval"); scrollBodyToTop() }}>Edit approval</Button>
                  )}
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-xs text-gray-400">Approved amount</p>
                    <p className="mt-1 text-sm font-semibold text-gray-100">
                      {Number(deliverable.approvedAmount) > 0 ? formatAmount(deliverable.approvedAmount) : "—"}
                    </p>
                  </div>
                  {deliverable.status !== "NOT_APPROVED" && (
                    <EditableTextField label="Approver" fieldName="approverName" value={deliverable.approverName}
                      deliverableId={deliverable.id} isReadOnly={isLocked} onSaved={refresh} />
                  )}
                </div>
                {missingApprovalDoc && (
                  <p className="text-xs text-amber-300">
                    No approval document uploaded.
                    {!isLocked && <button type="button" className="ml-2 font-medium underline" onClick={openApprovalUpload}>Upload approval document</button>}
                  </p>
                )}
              </section>

              {showDeliveryFinance && (
                <>
                  <section className={OVERVIEW_SECTION}>
                    <h2 className={OVERVIEW_HEADING}>Delivery</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <EditableTextField label="Delivery note reference" fieldName="deliveryNoteRef" value={deliverable.deliveryNoteRef}
                        deliverableId={deliverable.id} isReadOnly={isLocked} placeholder="BT-XXXXXXXXXX" onSaved={refresh} />
                      <DateField label="Delivered" value={deliverable.deliveredAt} deliverableId={deliverable.id}
                        field="deliveredAt" isReadOnly={isLocked} onSaved={refresh} />
                      <DateField label="Inventory issue out date" value={deliverable.inventoryIssueOutDate} deliverableId={deliverable.id}
                        field="inventoryIssueOutDate" isReadOnly={isReadOnly} onSaved={refresh} />
                    </div>
                  </section>
                  <section className={OVERVIEW_SECTION}>
                    <h2 className={OVERVIEW_HEADING}>Finance</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <EditableTextField label="PO/Invoice reference" fieldName="poInvoiceReference" value={deliverable.poInvoiceReference}
                        deliverableId={deliverable.id} isReadOnly={isReadOnly} placeholder="Optional reference" onSaved={refresh} />
                      <DateField label="Closed finance" value={deliverable.closedFinanceAt} deliverableId={deliverable.id}
                        field="closedFinanceAt" isReadOnly={isLocked} onSaved={refresh} />
                      {(deliverable.status === "CLOSED_FINANCE" || deliverable.closedFinanceNote) && (
                        <EditableTextField label="Finance note" fieldName="closedFinanceNote" value={deliverable.closedFinanceNote}
                          deliverableId={deliverable.id} isReadOnly={isLocked} onSaved={refresh} />
                      )}
                      {deliverable.status === "CLOSED_FINANCE" && <FinanceAmountField deliverable={deliverable} isReadOnly={isLocked} onSaved={refresh} />}
                    </div>
                  </section>
                </>
              )}

              <details className={OVERVIEW_SECTION}>
                <summary className={cn(OVERVIEW_HEADING, "cursor-pointer")}>Milestone history</summary>
                <div className="grid gap-3 sm:grid-cols-3">
                  <DateField label="Created" value={deliverable.createdAt} deliverableId={deliverable.id}
                    field="createdAt" nullable={false} isReadOnly={isLocked} onSaved={refresh} />
                  <DateField label="Partially approved" value={deliverable.partiallyApprovedAt} deliverableId={deliverable.id}
                    field="partiallyApprovedAt" isReadOnly={isLocked} onSaved={refresh} />
                  <DateField label="Approved" value={deliverable.approvedAt} deliverableId={deliverable.id}
                    field="approvedAt" isReadOnly={isLocked} onSaved={refresh} />
                </div>
              </details>
            </div>
          )}
          <DeliverableTabContent
            loading={loading}
            deliverable={deliverable}
            activeTab={activeTab}
            initialDocumentType={initialDocumentType}
            showUpload={showUpload}
            onShowUpload={setShowUpload}
            onRefresh={refresh}
            isAdmin={isAdmin}
            isLocked={!!isLocked}
            isReadOnly={isReadOnly}
          />
        </div>
      </div>
    </div>
  )
}
