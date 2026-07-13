"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import { Download, Trash2, FileUp, Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FileTypeIcon } from "@/shared/components/ui/file-type-icon"
import { PdfViewerModal } from "@/shared/components/ui/pdf-viewer-modal"
import { cn, formatDate, formatDateTime, formatBytes, truncateFilename, formatAmount, nameFromFile } from "@/shared/lib/utils"
import { useDropZone } from "@/shared/lib/use-drop-zone"

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
  agreement: { id: string; title: string; status: string }
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

function lineItemTotal(items: LineItem[]) {
  return items.reduce((s, li) => s + Number(li.amount), 0)
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
  const [amount, setAmount] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [docFile, setDocFile] = useState<File | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const lineTotal = lineItemTotal(deliverable.lineItems)
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
        body: JSON.stringify({ approve: true, approvedAmount: amtNum }),
      })
      if (!res.ok) { setError((await res.json() as { error?: string }).error ?? "Save failed"); return }
      reset()
      await onDone()
    } finally {
      setSaving(false)
    }
  }

  let dropZoneCls: string
  if (dragging) dropZoneCls = "border-[#006fff] bg-blue-50 dark:bg-blue-900/10"
  else if (docFile) dropZoneCls = "border-green-400 bg-green-50 dark:bg-green-900/10"
  else dropZoneCls = "border-gray-300 dark:border-gray-600 hover:border-gray-400"

  return (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
      <div className="flex flex-wrap gap-3 items-start">
        <div>
          <label htmlFor="approve-amount" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
            Approved Amount <span className="text-red-500">*</span>
          </label>
          <input
            id="approve-amount"
            autoFocus
            type="number"
            min="0"
            step="0.01"
            className="w-36 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-right text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleApprove() }}
          />
        </div>
        <div className="flex-1 min-w-60">
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
            Approval Document <span className="font-normal text-gray-400">(optional)</span>
          </p>
          <div className="flex gap-2 mb-2">
            <input
              className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </div>
          <button
            type="button"
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-sm",
              dropZoneCls
            )}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f) }}
            />
            <FileUp size={15} className={dragging ? "text-[#006fff]" : docFile ? "text-green-600" : "text-gray-400"} />
            {docFile
              ? <span className="font-medium text-green-700 dark:text-green-400 truncate">{docFile.name}</span>
              : <span className="text-gray-500 dark:text-gray-400"><span className="font-medium text-gray-700 dark:text-gray-300">Drop file</span> or click to browse</span>
            }
          </button>
          {uploading && <p className="text-xs text-gray-500 mt-0.5">Uploading…</p>}
        </div>
      </div>

      {willBePartial && (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
          Approved amount is less than the line item total ({formatAmount(lineTotal)}) — this will be set to <strong>Partially Approved</strong>.
        </p>
      )}
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
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-3">
      <div>
        <label htmlFor="edit-approval-amount" className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
          Approved Amount
        </label>
        <input
          id="edit-approval-amount"
          autoFocus
          type="number"
          min="0"
          step="0.01"
          className="w-36 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-right text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") handleUpdate() }}
        />
      </div>

      {willBePartial && (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded-md">
          Approved amount is less than the line item total ({formatAmount(lineTotal)}) — this will be set to <strong>Partially Approved</strong>.
        </p>
      )}
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
      <div className="flex gap-6 mb-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg text-sm">
        <div>
          <span className="text-gray-500 dark:text-gray-400">Approved: </span>
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            {approved > 0 ? formatAmount(approved) : "—"}
          </span>
        </div>
        <div>
          <span className="text-gray-500 dark:text-gray-400">Line items: </span>
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
            ⚠ Exceeds approved — re-approval needed
          </span>
        )}
      </div>

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
                      type="number" min="0" step="0.01"
                      className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 text-sm text-right text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  <td className="py-2 text-gray-800 dark:text-gray-200">{li.description}</td>
                  <td className="py-2 text-right text-gray-800 dark:text-gray-200 tabular-nums">{formatAmount(li.amount)}</td>
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
              className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Description"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setAdding(false) }}
            />
            <input
              type="number" min="0" step="0.01"
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

function DocList({ docs, label, isLocked, isAdmin, currentUserId, onDelete, onView }: {
  readonly docs: AdhocDoc[]
  readonly label: string
  readonly isLocked: boolean
  readonly isAdmin: boolean
  readonly currentUserId: string
  readonly onDelete: (id: string) => void
  readonly onView: (doc: AdhocDoc) => void
}) {
  if (docs.length === 0) {
    return (
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">{label}</p>
        <p className="text-xs text-gray-400 italic">None uploaded</p>
      </div>
    )
  }
  return (
    <div className="mb-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-2">{label}</p>
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-3 py-2.5 max-w-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <FileTypeIcon mimeType={doc.mimeType} />
                    <div className="min-w-0">
                      {doc.mimeType === "application/pdf" ? (
                        <button
                          type="button"
                          onClick={() => onView(doc)}
                          title="Click to view PDF"
                          className="font-medium text-gray-900 dark:text-gray-100 truncate block text-left w-full cursor-pointer hover:underline"
                        >
                          {doc.displayName}
                        </button>
                      ) : (
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{doc.displayName}</div>
                      )}
                      <div className="text-xs text-gray-400">{truncateFilename(doc.originalName)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap hidden md:table-cell">
                  {formatBytes(doc.size)} · {doc.uploadedBy.name} · {formatDate(doc.uploadedAt)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <a
                      href={`/api/adhoc/documents/${doc.id}`}
                      download={doc.originalName}
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Download"
                    >
                      <Download size={15} />
                    </a>
                    {(!isLocked || isAdmin) && (doc.uploadedBy.id === currentUserId || isAdmin) && (
                      <button
                        type="button"
                        onClick={() => onDelete(doc.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [docType, setDocType] = useState<"BUDGET" | "APPROVAL">("BUDGET")
  const [displayName, setDisplayName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
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
    await fetch(`/api/adhoc/documents/${docId}`, { method: "DELETE" })
    await onRefresh()
  }

  const budget = deliverable.documents.filter((d) => d.type === "BUDGET")
  const approval = deliverable.documents.filter((d) => d.type === "APPROVAL")

  let dropZoneCls: string
  if (dragging) dropZoneCls = "border-[#006fff] bg-blue-50 dark:bg-blue-900/10"
  else if (file) dropZoneCls = "border-green-400 bg-green-50 dark:bg-green-900/10"
  else dropZoneCls = "border-gray-300 dark:border-gray-600 hover:border-gray-400"

  return (
    <div>
      {!isLocked && (
        <div className="flex justify-end mb-3">
          <Button variant="secondary" size="sm" onClick={() => onShowUpload(!showUpload)}>
            <Upload size={13} className="mr-1.5" />
            Upload
          </Button>
        </div>
      )}

      <DocList
        docs={budget}
        label="Budget"
        isLocked={isLocked}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onDelete={handleDelete}
        onView={(doc) => setPdfViewer({ id: doc.id, name: doc.displayName })}
      />
      <DocList
        docs={approval}
        label="Approval"
        isLocked={isLocked}
        isAdmin={isAdmin}
        currentUserId={currentUserId}
        onDelete={handleDelete}
        onView={(doc) => setPdfViewer({ id: doc.id, name: doc.displayName })}
      />

      {showUpload && !isLocked && (
        <form
          onSubmit={handleUpload}
          className="mt-2 p-4 border border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50"
        >
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-2.5 sm:w-52 shrink-0">
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Type</label>
                <select
                  className="w-full rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-2 py-1.5 text-sm text-gray-900 dark:text-gray-100"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as "BUDGET" | "APPROVAL")}
                >
                  <option value="BUDGET">Budget</option>
                  <option value="APPROVAL">Approval</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Name *</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="Display name"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
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

            <button
              type="button"
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors min-h-[100px]",
                dropZoneCls
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg,.gif,.webp,.txt,.csv"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f) }}
              />
              {file ? (
                <>
                  <FileUp size={18} className="text-green-600" />
                  <p className="text-sm font-medium text-green-700 dark:text-green-400 text-center px-3">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatBytes(file.size)} · click to change</p>
                </>
              ) : (
                <>
                  <FileUp size={18} className={dragging ? "text-[#006fff]" : "text-gray-400 dark:text-gray-500"} />
                  <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Drop file here</span> or click to browse
                  </p>
                </>
              )}
            </button>
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

// ─── Change Log ───────────────────────────────────────────────────────────────

function ChangeLogTab({ logs }: { readonly logs: LogEntry[] }) {
  if (logs.length === 0)
    return <p className="text-sm text-gray-400 py-4 text-center">No activity yet.</p>

  return (
    <ul className="space-y-3">
      {logs.map((entry) => (
        <li key={entry.id} className="flex gap-3 text-sm">
          <div className="mt-2 w-1.5 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600 shrink-0" />
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
  const [showUpload, setShowUpload] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
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

  useEffect(() => {
    function onEnter(e: DragEvent) {
      if (e.dataTransfer?.types.includes("Files")) {
        setActiveTab("documents")
        setShowUpload(true)
      }
    }
    function onOver(e: DragEvent) {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault()
    }
    function onDrop(e: DragEvent) { e.preventDefault() }
    window.addEventListener("dragenter", onEnter)
    window.addEventListener("dragover", onOver)
    window.addEventListener("drop", onDrop)
    return () => {
      window.removeEventListener("dragenter", onEnter)
      window.removeEventListener("dragover", onOver)
      window.removeEventListener("drop", onDrop)
    }
  }, [])

  async function refresh() {
    await fetchDeliverable()
    await onRefresh()
  }

  async function saveField(title: string, description: string | null) {
    if (!deliverable) return
    await fetch(`/api/adhoc/deliverables/${deliverable.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description }),
    })
    await refresh()
  }

  function handleTitleBlur() {
    const trimmed = titleDraft.trim()
    if (!trimmed) { setTitleDraft(deliverable?.title ?? ""); return }
    if (trimmed !== deliverable?.title) saveField(trimmed, deliverable?.description ?? null)
  }

  function handleDescBlur() {
    const trimmed = descDraft.trim()
    const current = deliverable?.description ?? ""
    if (trimmed !== current) saveField(deliverable?.title ?? titleDraft, trimmed || null)
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
  const canApprove = deliverable?.status === "NOT_APPROVED"
  const canEditApproval = deliverable?.status === "PARTIALLY_APPROVED" || deliverable?.status === "APPROVED"
  const canDeliver = deliverable?.status === "APPROVED"
  const missingApprovalDoc =
    canEditApproval &&
    (deliverable?.documents.filter((d) => d.type === "APPROVAL").length ?? 0) === 0

  const itemsLabel = deliverable ? `Line Items (${deliverable.lineItems.length})` : "Line Items"
  const docsLabel = deliverable ? `Documents (${deliverable.documents.length})` : "Documents"
  const tabs = [
    { key: "items" as const, label: itemsLabel },
    { key: "documents" as const, label: docsLabel },
    { key: "log" as const, label: "Change Log" },
  ]

  let tabContent: React.ReactNode
  if (loading) {
    tabContent = (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
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
        {activeTab === "log" && <ChangeLogTab logs={deliverable.systemLogs} />}
      </>
    )
  } else {
    tabContent = <p className="text-sm text-gray-400">Failed to load.</p>
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 cursor-default" onClick={onClose} />

      <div className="relative ml-auto w-full max-w-2xl h-full bg-white dark:bg-gray-900 shadow-xl flex flex-col overflow-hidden">
        {/* Header — inline-editable title + description */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex-1 min-w-0 pr-4">
            {loading ? (
              <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            ) : (
              <>
                <textarea
                  className="w-full appearance-none bg-white dark:bg-gray-900 focus:bg-gray-50 dark:focus:bg-gray-800 border-b border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none text-2xl font-semibold text-gray-900 dark:text-gray-100 py-0.5 leading-tight transition-colors resize-none overflow-hidden disabled:opacity-50"
                  rows={1}
                  value={titleDraft}
                  disabled={!!isLocked}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur() } }}
                />
                <textarea
                  className="w-full mt-2 appearance-none bg-white dark:bg-gray-900 focus:bg-gray-50 dark:focus:bg-gray-800 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500 focus:outline-none text-sm text-gray-500 dark:text-gray-400 rounded px-1 resize-none transition-colors disabled:opacity-50"
                  rows={2}
                  placeholder={isLocked ? "" : "Add description…"}
                  value={descDraft}
                  disabled={!!isLocked}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onBlur={handleDescBlur}
                  onKeyDown={(e) => { if (e.key === "Escape") setDescDraft(deliverable?.description ?? "") }}
                />
                <p className="text-xs text-gray-400 mt-0.5">Created by {deliverable?.createdBy.name}</p>
              </>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Meta bar */}
        {deliverable && (
          <div className="px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
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
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {canApprove && !approvePanelOpen && (
                  <Button size="sm" variant="outline" onClick={() => setApprovePanelOpen(true)}>Approve</Button>
                )}
                {canEditApproval && !editingApproval && (
                  <Button size="sm" variant="ghost" onClick={() => setEditingApproval(true)}>Edit Approval</Button>
                )}
                {canDeliver && (
                  <Button size="sm" variant="outline" onClick={() => handleTransition("DELIVERED")} disabled={transitioning}>
                    {transitioning ? "Saving…" : "Mark Delivered"}
                  </Button>
                )}
              </div>
            </div>

            {missingApprovalDoc && !editingApproval && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-md">
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

        {/* Tabs */}
        <div className="flex gap-0 border-b border-gray-200 dark:border-gray-700 px-6">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
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
          {tabContent}
        </div>
      </div>
    </div>
  )
}
