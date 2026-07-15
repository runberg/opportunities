"use client"

import { useState, useEffect } from "react"
import { Upload } from "lucide-react"
import type { AgreementRow } from "./adhoc-client"
import { DeliverablesTable } from "./deliverables-table"
import { AgreementForm } from "./agreement-form"
import { AdhocDocList } from "./adhoc-doc-list"
import { Button } from "@/shared/components/ui/button"
import { PdfViewerModal } from "@/shared/components/ui/pdf-viewer-modal"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { todayISO, formatAmount, formatDate, nameFromFile } from "@/shared/lib/utils"
import { useDropZone, useWindowDragExpand } from "@/shared/lib/use-drop-zone"
import { FileDropZone } from "@/shared/components/ui/file-drop-zone"

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

function defaultTabIndex(agreements: AgreementRow[]) {
  const idx = agreements.findIndex((a) => a.status === "SIGNED" || a.status === "ACTIVE")
  return Math.max(0, idx)
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
  const [pdfViewer, setPdfViewer] = useState<{ id: string; name: string } | null>(null)

  const docType = agreement.status === "SIGNED" || agreement.status === "ACTIVE"
    ? "COUNTERSIGNED" : "DRAFT"
  const isClosed = agreement.status === "CLOSED"

  useWindowDragExpand(() => setShowUpload(true))

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

      <AdhocDocList
        docs={drafts}
        label="Draft Agreement"
        downloadUrl={(id) => `/api/adhoc/agreement-documents/${id}`}
        canDelete={() => isAdmin}
        onDelete={handleDelete}
        onView={(doc) => setPdfViewer({ id: doc.id, name: doc.displayName })}
      />
      <AdhocDocList
        docs={countersigned}
        label="Counter-signed"
        downloadUrl={(id) => `/api/adhoc/agreement-documents/${id}`}
        canDelete={() => isAdmin}
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
                <label htmlFor="agr-doc-name" className="block text-xs font-medium text-gray-600 mb-1">Name *</label>
                <input
                  id="agr-doc-name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  placeholder="e.g. Agreement Draft v1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div>
                <label htmlFor="agr-doc-notes" className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                <input
                  id="agr-doc-notes"
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

            <FileDropZone
              file={file}
              dragging={dragging}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onFile={applyFile}
              accept=".pdf,.xlsx,.xls,.docx,.doc,.pptx,.ppt,.png,.jpg,.jpeg"
            />
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
  const [error, setError] = useState<string | null>(null)
  function applyFile(f: File) {
    setFile(f)
    setDisplayName((prev) => prev.trim() === "" ? nameFromFile(f) : prev)
  }

  const { dragging, onDragOver, onDragLeave, onDrop } = useDropZone(applyFile)

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
      const res = await fetch(`/api/adhoc/agreements/${agreementId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "SIGNED", signedDate }),
      })
      if (!res.ok) { setError((await res.json() as { error?: string }).error ?? "Failed to save"); return }
      onDone()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 cursor-default" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Mark Agreement Signed</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="sign-date" className="block text-xs font-medium text-gray-700 mb-1">Signed Date</label>
            <DatePicker
              value={signedDate}
              onChange={setSignedDate}
              triggerClassName="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center"
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
            <FileDropZone
              file={file}
              dragging={dragging}
              onDragOver={onDragOver}
              onDragLeave={onDragLeave}
              onDrop={onDrop}
              onFile={applyFile}
              accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
              compact
            />
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
