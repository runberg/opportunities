"use client"

import { useState, useRef, useEffect } from "react"
import type { AgreementRow, AgreementDocument } from "./adhoc-client"
import { DeliverablesTable } from "./deliverables-table"
import { AgreementForm } from "./agreement-form"
import { Button } from "@/shared/components/ui/button"
import { formatDate } from "@/shared/lib/utils"
import { todayISO } from "@/shared/lib/utils"

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

// ─── Sign dialog ──────────────────────────────────────────────────────────────

type SignDialogProps = {
  readonly agreementId: string
  readonly onDone: () => void
  readonly onCancel: () => void
}

function SignDialog({ agreementId, onDone, onCancel }: SignDialogProps) {
  const [signedDate, setSignedDate] = useState(todayISO())
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [notes, setNotes] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSign() {
    setSaving(true)
    try {
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

  async function handleUpload(file: File) {
    if (!displayName.trim()) { setUploadError("Please enter a display name"); return }
    setUploading(true)
    setUploadError(null)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("displayName", displayName.trim())
      fd.append("type", "COUNTERSIGNED")
      if (notes.trim()) fd.append("notes", notes.trim())
      const res = await fetch(`/api/adhoc/agreements/${agreementId}/documents`, {
        method: "POST",
        body: fd,
      })
      if (!res.ok) { setUploadError((await res.json()).error ?? "Upload failed"); return }
      setDisplayName("")
      setNotes("")
      if (fileRef.current) fileRef.current.value = ""
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 cursor-default" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Mark Agreement Signed</h2>

        <div className="space-y-3">
          <div>
            <label htmlFor="sign-date" className="block text-xs font-medium text-gray-700 mb-1">
              Signed Date
            </label>
            <input
              id="sign-date"
              type="date"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={signedDate}
              onChange={(e) => setSignedDate(e.target.value)}
            />
          </div>

          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-2">
              Counter-signed document <span className="text-gray-400 font-normal">(optional — can be uploaded later)</span>
            </p>
            <input
              id="sign-display-name"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <input
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
              className="text-sm text-gray-700"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
              disabled={uploading}
            />
            {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
            {uploading && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSign} disabled={saving || uploading}>
            {saving ? "Saving…" : "Confirm Signed"}
          </Button>
        </div>
      </div>
    </div>
  )
}

// ─── Agreement documents ──────────────────────────────────────────────────────

type AgreementDocsProps = {
  readonly agreement: AgreementRow
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onRefresh: () => Promise<void>
}

function AgreementDocs({ agreement, currentUserId, isAdmin, onRefresh }: AgreementDocsProps) {
  const [uploading, setUploading] = useState(false)
  const [displayName, setDisplayName] = useState("")
  const [notes, setNotes] = useState("")
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const docType = agreement.status === "SIGNED" || agreement.status === "ACTIVE"
    ? "COUNTERSIGNED"
    : "DRAFT"

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
      const res = await fetch(`/api/adhoc/agreements/${agreement.id}/documents`, {
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
    await fetch(`/api/adhoc/agreement-documents/${docId}`, { method: "DELETE" })
    await onRefresh()
  }

  const drafts = agreement.documents.filter((d) => d.type === "DRAFT")
  const countersigned = agreement.documents.filter((d) => d.type === "COUNTERSIGNED")

  function DocList({ docs, label }: { docs: AgreementDocument[]; label: string }) {
    if (docs.length === 0) return null
    return (
      <div className="mb-2">
        <p className="text-xs font-medium text-gray-500 uppercase mb-1">{label}</p>
        <ul className="space-y-1">
          {docs.map((doc) => (
            <li key={doc.id} className="flex items-center justify-between gap-2 group">
              <div className="min-w-0">
                <a
                  href={`/api/adhoc/agreement-documents/${doc.id}`}
                  className="text-sm font-medium text-blue-600 hover:underline truncate block"
                  download
                >
                  {doc.displayName}
                </a>
                <p className="text-xs text-gray-400">
                  {doc.uploadedBy.name} · {formatDate(doc.uploadedAt)}
                </p>
              </div>
              {(doc.uploadedBy.id === currentUserId || isAdmin) && (
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
      </div>
    )
  }

  const isClosed = agreement.status === "CLOSED"

  return (
    <div className="mt-4 pt-4 border-t border-gray-200">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Agreement Documents</p>
      <DocList docs={drafts} label="Draft Agreement" />
      <DocList docs={countersigned} label="Counter-signed" />
      {agreement.documents.length === 0 && (
        <p className="text-xs text-gray-400 italic mb-2">No documents uploaded yet.</p>
      )}

      {!isClosed && (
        <div className="mt-2">
          <p className="text-xs font-medium text-gray-600 mb-1">
            Upload {docType === "COUNTERSIGNED" ? "counter-signed copy" : "draft agreement"}
          </p>
          <div className="flex flex-wrap gap-2 mb-1">
            <input
              className="flex-1 min-w-40 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
            <input
              className="flex-1 min-w-48 rounded border border-gray-300 bg-white px-2 py-1.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg"
            className="text-sm text-gray-700"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f) }}
            disabled={uploading}
          />
          {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
          {uploading && <p className="text-xs text-gray-500 mt-1">Uploading…</p>}
        </div>
      )}
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

  const agreement = agreements[activeTab]
  if (!agreement) return null

  const committedAmount = agreement.deliverables.reduce(
    (sum, d) => sum + Number(d.approvedAmount),
    0
  )
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
      {/* Tabs */}
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

      {/* Agreement header */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        {/* Always-visible compact row */}
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

        {/* Expandable details: documents + management actions */}
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

      {/* Deliverables */}
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
