"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { Download, Trash2, FileUp, Upload } from "lucide-react"
import type { AgreementRow, AgreementDocument } from "./adhoc-client"
import { DeliverablesTable } from "./deliverables-table"
import { AgreementForm } from "./agreement-form"
import { Button } from "@/shared/components/ui/button"
import { FileTypeIcon } from "@/shared/components/ui/file-type-icon"
import { PdfViewerModal } from "@/shared/components/ui/pdf-viewer-modal"
import { cn, formatDate, formatBytes, truncateFilename, todayISO } from "@/shared/lib/utils"

const STATUS_BADGE: Record<string, string> = {
  DRAFT:  "bg-gray-100 text-gray-600",
  SIGNED: "bg-green-50 text-green-700",
  ACTIVE: "bg-green-50 text-green-700",
  CLOSED: "bg-gray-100 text-gray-500",
}

const STATUS_LABEL: Record<string, string> = {
  DRAFT:  "Draft",
  SIGNED: "Signed",
  ACTIVE: "Active",
  CLOSED: "Closed",
}

function formatAmount(amount: string | number) {
  return Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function defaultTabIndex(agreements: AgreementRow[]) {
  const idx = agreements.findIndex((a) => a.status === "SIGNED" || a.status === "ACTIVE")
  return Math.max(0, idx)
}

function nameFromFile(f: File): string {
  return f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim()
}

// ─── Document list ────────────────────────────────────────────────────────────

type DocListProps = {
  readonly docs: AgreementDocument[]
  readonly label: string
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onDelete: (docId: string) => void
  readonly onView: (doc: AgreementDocument) => void
}

function DocList({ docs, label, currentUserId, isAdmin, onDelete, onView }: DocListProps) {
  if (docs.length === 0) return null
  return (
    <div className="mb-3">
      <p className="text-xs font-medium text-gray-500 uppercase mb-1.5">{label}</p>
      <div className="border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100">
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50">
                <td className="px-3 py-2.5 max-w-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <FileTypeIcon mimeType={doc.mimeType} />
                    <div className="min-w-0">
                      {doc.mimeType === "application/pdf" ? (
                        <button
                          type="button"
                          onClick={() => onView(doc)}
                          title="Click to view PDF"
                          className="font-medium text-gray-900 truncate block text-left w-full cursor-pointer hover:underline"
                        >
                          {doc.displayName}
                        </button>
                      ) : (
                        <div className="font-medium text-gray-900 truncate">{doc.displayName}</div>
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
                      href={`/api/adhoc/agreement-documents/${doc.id}`}
                      download={doc.originalName}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                      title="Download"
                    >
                      <Download size={15} />
                    </a>
                    {(isAdmin || doc.uploadedBy.id === currentUserId) && (
                      <button
                        type="button"
                        onClick={() => onDelete(doc.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
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

// ─── Agreement documents panel ────────────────────────────────────────────────

type AgreementDocsProps = {
  readonly agreement: AgreementRow
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onRefresh: () => Promise<void>
}

function AgreementDocs({ agreement, currentUserId, isAdmin, onRefresh }: AgreementDocsProps) {
  const [showUpload, setShowUpload] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [notes, setNotes] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const [pdfViewer, setPdfViewer] = useState<{ id: string; name: string } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const docType = agreement.status === "SIGNED" || agreement.status === "ACTIVE"
    ? "COUNTERSIGNED" : "DRAFT"
  const isClosed = agreement.status === "CLOSED"

  useEffect(() => {
    function onEnter(e: DragEvent) {
      if (e.dataTransfer?.types.includes("Files")) setShowUpload(true)
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

  function applyFile(f: File) {
    setFile(f)
    setDisplayName((prev) => prev.trim() === "" ? nameFromFile(f) : prev)
  }

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) applyFile(f)
  }, [])

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
      if (notes.trim()) fd.append("notes", notes.trim())
      const res = await fetch(`/api/adhoc/agreements/${agreement.id}/documents`, { method: "POST", body: fd })
      if (!res.ok) { setUploadError((await res.json() as { error?: string }).error ?? "Upload failed"); return }
      setShowUpload(false)
      setFile(null)
      setDisplayName("")
      setNotes("")
      await onRefresh()
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(docId: string) {
    await fetch(`/api/adhoc/agreement-documents/${docId}`, { method: "DELETE" })
    await onRefresh()
  }

  const drafts = agreement.documents.filter((d) => d.type === "DRAFT")
  const countersigned = agreement.documents.filter((d) => d.type === "COUNTERSIGNED")

  let dropZoneCls: string
  if (dragging) dropZoneCls = "border-[#006fff] bg-blue-50"
  else if (file) dropZoneCls = "border-green-400 bg-green-50"
  else dropZoneCls = "border-gray-300 hover:border-gray-400"

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agreement Documents</p>
        {!isClosed && (
          <Button variant="secondary" size="sm" onClick={() => setShowUpload((v) => !v)}>
            <Upload size={13} className="mr-1.5" />
            Upload
          </Button>
        )}
      </div>

      <DocList
        docs={drafts}
        label="Draft Agreement"
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onDelete={handleDelete}
        onView={(doc) => setPdfViewer({ id: doc.id, name: doc.displayName })}
      />
      <DocList
        docs={countersigned}
        label="Counter-signed"
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onDelete={handleDelete}
        onView={(doc) => setPdfViewer({ id: doc.id, name: doc.displayName })}
      />

      {agreement.documents.length === 0 && !showUpload && (
        <p className="text-xs text-gray-400 italic mb-2">No documents uploaded yet.</p>
      )}

      {showUpload && !isClosed && (
        <form
          onSubmit={handleUpload}
          className="mt-2 p-4 border border-gray-200 rounded-xl bg-gray-50"
        >
          <p className="text-xs font-medium text-gray-600 mb-3">
            Upload {docType === "COUNTERSIGNED" ? "counter-signed copy" : "draft agreement"}
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex flex-col gap-2.5 sm:w-52 shrink-0">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="e.g. Agreement Draft v1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div className="flex gap-2 pt-0.5">
                <Button type="submit" size="sm" disabled={uploading || !file}>
                  {uploading ? "Uploading…" : "Upload"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowUpload(false); setFile(null); setDisplayName(""); setNotes("") }}
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
                onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f) }}
              />
              {file ? (
                <>
                  <FileUp size={18} className="text-green-600" />
                  <p className="text-sm font-medium text-green-700 text-center px-3">{file.name}</p>
                  <p className="text-xs text-gray-400">{formatBytes(file.size)} · click to change</p>
                </>
              ) : (
                <>
                  <FileUp size={18} className={dragging ? "text-[#006fff]" : "text-gray-400"} />
                  <p className="text-sm text-gray-500 text-center">
                    <span className="font-medium text-gray-700">Drop file here</span> or click to browse
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
          fileUrl={`/api/adhoc/agreement-documents/${pdfViewer.id}`}
          docName={pdfViewer.name}
          onClose={() => setPdfViewer(null)}
        />
      )}
    </div>
  )
}

// ─── Sign dialog ──────────────────────────────────────────────────────────────

type SignDialogProps = {
  readonly agreementId: string
  readonly onDone: () => void
  readonly onCancel: () => void
}

function SignDialog({ agreementId, onDone, onCancel }: SignDialogProps) {
  const [signedDate, setSignedDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [displayName, setDisplayName] = useState("")
  const [notes, setNotes] = useState("")
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function applyFile(f: File) {
    setFile(f)
    setDisplayName((prev) => prev.trim() === "" ? nameFromFile(f) : prev)
  }

  const onDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) applyFile(f)
  }, [])

  async function handleSign() {
    if (file && !displayName.trim()) { setError("Please enter a name for the document"); return }
    setSaving(true)
    setError(null)
    try {
      if (file) {
        const fd = new FormData()
        fd.append("file", file)
        fd.append("displayName", displayName.trim())
        fd.append("type", "COUNTERSIGNED")
        if (notes.trim()) fd.append("notes", notes.trim())
        const upRes = await fetch(`/api/adhoc/agreements/${agreementId}/documents`, { method: "POST", body: fd })
        if (!upRes.ok) { setError((await upRes.json() as { error?: string }).error ?? "Upload failed"); return }
      }
      await fetch(`/api/adhoc/agreements/${agreementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SIGNED", signedDate }),
      })
      onDone()
    } finally {
      setSaving(false)
    }
  }

  let dropZoneCls: string
  if (dragging) dropZoneCls = "border-[#006fff] bg-blue-50"
  else if (file) dropZoneCls = "border-green-400 bg-green-50"
  else dropZoneCls = "border-gray-300 hover:border-gray-400"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 cursor-default" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Mark Agreement Signed</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="sign-date" className="block text-xs font-medium text-gray-700 mb-1">Signed Date</label>
            <input
              id="sign-date"
              type="date"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={signedDate}
              onChange={(e) => setSignedDate(e.target.value)}
            />
          </div>

          <div className="border-t border-gray-200 pt-3">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Counter-signed document <span className="text-gray-400 font-normal">(optional)</span>
            </p>
            <div className="flex gap-2 mb-2">
              <input
                className="flex-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Display name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
              />
              <input
                className="w-32 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <button
              type="button"
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg border-2 border-dashed cursor-pointer transition-colors text-sm",
                dropZoneCls
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) applyFile(f) }}
              />
              <FileUp size={16} className={dragging ? "text-[#006fff]" : file ? "text-green-600" : "text-gray-400"} />
              {file
                ? <span className="font-medium text-green-700 truncate">{file.name}</span>
                : <span className="text-gray-500"><span className="font-medium text-gray-700">Drop file</span> or click to browse</span>
              }
            </button>
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSign} disabled={saving}>
            {saving ? "Saving…" : "Confirm Signed"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Tabs ─────────────────────────────────────────────────────────────────────

type Props = {
  readonly agreements: AgreementRow[]
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onRefresh: () => Promise<void>
}

export function AgreementTabs({ agreements, currentUserId, isAdmin, onRefresh }: Props) {
  const [activeTab, setActiveTab] = useState(() => defaultTabIndex(agreements))
  const [showDetails, setShowDetails] = useState(false)
  const [showSignDialog, setShowSignDialog] = useState(false)
  const [transitioning, setTransitioning] = useState(false)
  const [editingAgreement, setEditingAgreement] = useState<AgreementRow | null>(null)

  useEffect(() => { setShowDetails(false) }, [activeTab])

  useEffect(() => {
    if (activeTab >= agreements.length && agreements.length > 0)
      setActiveTab(agreements.length - 1)
  }, [agreements.length, activeTab])

  const agreement = agreements[activeTab]
  if (!agreement) return null

  const committedAmount = agreement.deliverables.reduce((sum, d) => sum + Number(d.approvedAmount), 0)
  const remaining = Number(agreement.totalAmount) - committedAmount
  const isOver = committedAmount > Number(agreement.totalAmount)

  async function handleClose() {
    setTransitioning(true)
    try {
      await fetch(`/api/adhoc/agreements/${agreement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CLOSED" }),
      })
      await onRefresh()
    } finally {
      setTransitioning(false)
    }
  }

  const canSign = agreement.status === "DRAFT"
  const canClose = agreement.status === "SIGNED" || agreement.status === "ACTIVE"
  const isClosed = agreement.status === "CLOSED"

  return (
    <div>
      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {agreements.map((a, i) => (
          <button
            key={a.id}
            type="button"
            onClick={() => setActiveTab(i)}
            className={[
              "px-4 py-2 text-sm font-medium rounded-t-md border border-b-0 transition-colors",
              i === activeTab
                ? "bg-white border-gray-200 text-gray-900"
                : "bg-gray-50 border-transparent text-gray-500 hover:text-gray-700",
            ].join(" ")}
          >
            {a.title}
            <span className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${STATUS_BADGE[a.status]}`}>
              {STATUS_LABEL[a.status]}
            </span>
          </button>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-base font-semibold text-gray-900 truncate">{agreement.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {agreement.createdBy.name}
              {agreement.signedDate && (
                <span className="ml-2 text-green-700">· Signed {formatDate(agreement.signedDate)}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-4 shrink-0">
            <div className="text-right">
              <p className="text-xs text-gray-400">Total</p>
              <p className="text-sm font-semibold text-gray-900">{formatAmount(agreement.totalAmount)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Committed</p>
              <p className={`text-sm font-semibold ${isOver ? "text-red-600" : "text-gray-900"}`}>
                {formatAmount(committedAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Remaining</p>
              <p className={`text-sm font-semibold ${isOver ? "text-red-600" : "text-green-700"}`}>
                {formatAmount(remaining)}
              </p>
            </div>
            {canSign && (
              <Button variant="outline" size="sm" onClick={() => setShowSignDialog(true)}>
                Mark Signed
              </Button>
            )}
            <button
              type="button"
              aria-label={showDetails ? "Collapse details" : "Expand details"}
              onClick={() => setShowDetails((v) => !v)}
              className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-4 h-4 transition-transform ${showDetails ? "rotate-180" : ""}`}
                viewBox="0 0 20 20"
                fill="currentColor"
                aria-hidden="true"
              >
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {showDetails && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <AgreementDocs
              agreement={agreement}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onRefresh={onRefresh}
            />
            <div className="flex justify-end gap-2 mt-3">
              {!isClosed && (
                <Button variant="ghost" size="sm" onClick={() => setEditingAgreement(agreement)}>
                  Edit
                </Button>
              )}
              {canClose && (
                <Button variant="outline" size="sm" onClick={handleClose} disabled={transitioning}>
                  {transitioning ? "Saving…" : "Close Agreement"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>

      <DeliverablesTable
        agreement={agreement}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onRefresh={onRefresh}
      />

      {showSignDialog && (
        <SignDialog
          agreementId={agreement.id}
          onDone={() => { setShowSignDialog(false); onRefresh() }}
          onCancel={() => setShowSignDialog(false)}
        />
      )}

      {editingAgreement && (
        <AgreementForm
          agreement={editingAgreement}
          onClose={() => setEditingAgreement(null)}
          onSaved={() => { setEditingAgreement(null); onRefresh() }}
        />
      )}
    </div>
  )
}
