"use client"

import { Fragment, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FileViewerModals } from "@/shared/components/ui/file-viewer-modals"
import { useFileViewer } from "@/shared/lib/use-file-viewer"
import { DocNameCell } from "@/shared/components/ui/doc-name-cell"
import { DocActionCell } from "@/shared/components/ui/doc-action-cell"
import { formatBytes, formatDate, nameFromFile } from "@/shared/lib/utils"
import { useDropZone, useWindowDragExpand } from "@/shared/lib/use-drop-zone"
import { FileDropZone } from "@/shared/components/ui/file-drop-zone"
import { DocEditForm } from "@/shared/components/ui/doc-edit-form"
import { KIND_LABEL, kindOptions, type DocKind } from "@/modules/opportunities/document-kinds"


interface QuoteDoc {
  id: string
  displayName: string
  originalName: string
  mimeType: string
  size: number
  docStatus: string
  type?: string
  uploadedAt: Date | string
  uploadedBy: { id: string; name: string }
}

const DOC_TYPE_LABELS = {
  QUOTE: { section: "Quote Documents", empty: "No quote documents yet." },
  EL:    { section: "EL Documents",    empty: "No EL documents yet." },
  FAT:   { section: "FAT Documents",   empty: "No FAT documents yet." },
  SAT:   { section: "SAT Documents",   empty: "No SAT documents yet." },
} as const

interface QuoteSectionProps {
  readonly opportunityId: string
  readonly documents: QuoteDoc[]
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onRefresh?: () => void
  readonly docType?: "QUOTE" | "EL" | "FAT" | "SAT"
  /** Multi-type mode (Production Documents): the section shows several document kinds and the
   * upload/edit forms offer a type selector. When absent, the section is one fixed docType. */
  readonly selectableTypes?: readonly DocKind[]
  /** Every kind a document here can be moved to (all sections available at the opportunity
   * stage). Omit or pass a single kind to hide the type selector when editing. */
  readonly moveTargets?: readonly DocKind[]
  readonly isReadOnly?: boolean
}

export function QuoteSection({
  opportunityId,
  documents,
  currentUserId,
  isAdmin,
  onRefresh,
  docType = "QUOTE",
  selectableTypes,
  moveTargets,
  isReadOnly = false,
}: QuoteSectionProps) {
  const router = useRouter()

  const viewers = useFileViewer()
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [docStatus, setDocStatus] = useState("DRAFT")
  const [uploadType, setUploadType] = useState<DocKind>(selectableTypes?.[0] ?? docType)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)

  const typeOptions = selectableTypes ? kindOptions(selectableTypes) : null
  const editTypeOptions = moveTargets && moveTargets.length > 1 ? kindOptions(moveTargets) : null

  const hasFileRef = useRef(false)

  useWindowDragExpand(
    () => { if (!isReadOnly) setShowUpload(true) },
    () => { if (!hasFileRef.current) setShowUpload(false) },
  )

  function applyFile(f: File) {
    hasFileRef.current = true
    setFile(f)
    setDisplayName((prev) => (prev.trim() === "" ? nameFromFile(f) : prev))
  }

  const { dragging, onDragOver, onDragLeave, onDrop } = useDropZone(applyFile)

  async function handleUpload(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) return
    const formData = new FormData()
    formData.set("file", file)
    formData.set("displayName", displayName.trim())
    formData.set("docStatus", docStatus)
    formData.set("type", selectableTypes ? uploadType : docType)
    setUploading(true)
    setUploadError("")
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/documents`, {
        method: "POST",
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setUploadError(data.error ?? "Upload failed.")
        return
      }
      setShowUpload(false)
      setDisplayName("")
      setDocStatus("DRAFT")
      setFile(null)
      hasFileRef.current = false
      onRefresh?.()
      router.refresh()
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(docId: string, docName: string) {
    if (!confirm(`Delete "${docName}"? This cannot be undone.`)) return
    await fetch(`/api/files/${docId}`, { method: "DELETE" })
    onRefresh?.()
    router.refresh()
  }

  const { section: sectionLabel, empty: emptyLabel } = selectableTypes
    ? { section: "Production Documents", empty: "No production documents yet." }
    : DOC_TYPE_LABELS[docType]
  const columnCount = selectableTypes ? 6 : 5

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      {/* Documents */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-200">
            {sectionLabel}
            <span className="ml-1.5 text-gray-400 font-normal">({documents.length})</span>
          </p>
          {!isReadOnly && (
            <Button variant="secondary" size="sm" onClick={() => setShowUpload((v) => !v)}>
              <Upload size={13} className="mr-1.5" />
              Upload
            </Button>
          )}
        </div>

        {showUpload && (
          <form
            onSubmit={handleUpload}
            className="mb-4 p-4 border border-gray-700 rounded-xl bg-gray-800/50"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Left: fields */}
              <div className="flex flex-col gap-3 sm:w-56 shrink-0">
                <div>
                  <label htmlFor="qs-doc-name" className="block text-xs font-medium text-gray-400 mb-1">
                    Document Name *
                  </label>
                  <input
                    id="qs-doc-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="e.g. Quote v1 — ACME"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  />
                </div>
                {typeOptions && (
                  <div>
                    <label htmlFor="qs-doc-type" className="block text-xs font-medium text-gray-400 mb-1">Type</label>
                    <select
                      id="qs-doc-type"
                      value={uploadType}
                      onChange={(e) => setUploadType(e.target.value as DocKind)}
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-500"
                    >
                      {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                )}
                <div>
                  <label htmlFor="qs-doc-version" className="block text-xs font-medium text-gray-400 mb-1">Version</label>
                  <select
                    id="qs-doc-version"
                    value={docStatus}
                    onChange={(e) => setDocStatus(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-500"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="FINAL">Final</option>
                  </select>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button type="submit" size="sm" disabled={uploading || !file}>
                    {uploading ? "Uploading…" : "Upload"}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => { setShowUpload(false); setFile(null); setDisplayName(""); hasFileRef.current = false }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Right: drop zone */}
              <FileDropZone
                file={file}
                dragging={dragging}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onFile={applyFile}
                className="min-h-[120px]"
              />
            </div>
            {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
          </form>
        )}

        {documents.length === 0 ? (
          <p className="text-sm text-gray-400">
            {emptyLabel}
          </p>
        ) : (
          <div className="border border-gray-700 rounded-xl overflow-x-auto">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-gray-800/50 border-b border-gray-700">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400">Name</th>
                  {selectableTypes && <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 w-24">Type</th>}
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 w-20">Version</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 hidden sm:table-cell w-20">Size</th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 hidden md:table-cell w-48">Uploaded</th>
                  <th className="px-4 py-2.5 w-28" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {documents.map((doc) => (
                  <Fragment key={doc.id}>
                  <tr className="hover:bg-gray-800/50">
                    <DocNameCell
                      doc={doc}
                      onView={() => viewers.openViewer(doc)}
                    />
                    {selectableTypes && (
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-900/40 text-blue-300">
                          {KIND_LABEL[doc.type as DocKind] ?? doc.type}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          doc.docStatus === "FINAL"
                            ? "bg-green-900/40 text-green-300"
                            : "bg-gray-700 text-gray-300"
                        }`}
                      >
                        {doc.docStatus === "FINAL" ? "Final" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden sm:table-cell truncate">
                      {formatBytes(doc.size)}
                    </td>
                    <td className="px-4 py-3 text-gray-400 hidden md:table-cell truncate" title={`${doc.uploadedBy.name} · ${formatDate(doc.uploadedAt)}`}>
                      {doc.uploadedBy.name} · {formatDate(doc.uploadedAt)}
                    </td>
                    <DocActionCell
                      downloadHref={`/api/files/${doc.id}`}
                      originalName={doc.originalName}
                      onDelete={isAdmin ? () => handleDelete(doc.id, doc.displayName) : null}
                      onEdit={isReadOnly ? null : () => setEditingId(doc.id)}
                      className="px-4 py-3 w-28"
                    />
                  </tr>
                  {editingId === doc.id && (
                    <tr>
                      <td colSpan={columnCount} className="p-0">
                        <DocEditForm
                          url={`/api/files/${doc.id}`}
                          initialName={doc.displayName}
                          initialType={doc.type ?? docType}
                          typeOptions={editTypeOptions}
                          initialVersion={doc.docStatus}
                          onCancel={() => setEditingId(null)}
                          onSaved={() => { setEditingId(null); onRefresh?.(); router.refresh() }}
                        />
                      </td>
                    </tr>
                  )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <FileViewerModals viewers={viewers} urlFor={(id) => `/api/files/${id}`} />
    </div>
  )
}
