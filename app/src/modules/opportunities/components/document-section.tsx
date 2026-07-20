"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { formatBytes, formatDate, DOC_TYPE_LABELS } from "@/shared/lib/utils"
import { Upload } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { DocNameCell } from "@/shared/components/ui/doc-name-cell"
import { DocActionCell } from "@/shared/components/ui/doc-action-cell"
import { PdfViewerModal } from "@/shared/components/ui/pdf-viewer-modal"

interface Document {
  id: string
  displayName: string
  originalName: string
  mimeType: string
  size: number
  type: string
  docStatus: string
  uploadedAt: Date | string
  uploadedBy: { id: string; name: string }
}

interface DocumentSectionProps {
  readonly opportunityId: string
  readonly documents: Document[]
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onRefresh?: () => void
}

const TYPE_FILTERS = ["ALL", "QUOTE", "EL", "OTHER"] as const
type TypeFilter = (typeof TYPE_FILTERS)[number]

export function DocumentSection({
  opportunityId,
  documents,
  currentUserId,
  isAdmin,
  onRefresh,
}: DocumentSectionProps) {
  const router = useRouter()
  const [pdfViewer, setPdfViewer] = useState<{ id: string; name: string } | null>(null)
  const [filter, setFilter] = useState<TypeFilter>("ALL")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")
  const [showForm, setShowForm] = useState(false)

  const filtered =
    filter === "ALL" ? documents : documents.filter((d) => d.type === filter)

  async function handleUpload(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
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
      setShowForm(false)
      ;(e.target as HTMLFormElement).reset()
      onRefresh?.()
      router.refresh()
    } finally {
      setUploading(false)
    }
  }

  async function handleDelete(docId: string, docName: string) {
    if (!confirm(`Delete "${docName}"? This cannot be undone.`)) return
    const res = await fetch(`/api/files/${docId}`, { method: "DELETE" })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      alert(data.error ?? "Failed to delete document.")
      return
    }
    onRefresh?.()
    router.refresh()
  }

  function docStatusBadge(status: string) {
    if (status === "FINAL") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-900/40 text-green-300">
          Final
        </span>
      )
    }
    return (
      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-300">
        Draft
      </span>
    )
  }

  function docTypeBadge(type: string) {
    const styles: Record<string, string> = {
      QUOTE: "bg-sky-900/40 text-sky-300",
      EL: "bg-violet-900/40 text-violet-300",
      OTHER: "bg-gray-700 text-gray-300",
    }
    return (
      <span
        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${styles[type] ?? "bg-gray-700 text-gray-300"}`}
      >
        {DOC_TYPE_LABELS[type] ?? type}
      </span>
    )
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-200">
          Documents{" "}
          <span className="text-gray-400 font-normal">({documents.length})</span>
        </h2>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setShowForm((v) => !v)}
        >
          <Upload size={14} className="mr-1.5" />
          Upload
        </Button>
      </div>

      {/* Upload form */}
      {showForm && (
        <form
          onSubmit={handleUpload}
          className="mb-5 p-4 border border-gray-700 rounded-xl bg-gray-800/50 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="doc-name" className="block text-xs font-medium text-gray-400 mb-1">
                Document Name *
              </label>
              <input
                id="doc-name"
                name="displayName"
                required
                placeholder="e.g. Draft Quote v2"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500"
              />
            </div>

            <div>
              <label htmlFor="doc-file" className="block text-xs font-medium text-gray-400 mb-1">File *</label>
              <input
                id="doc-file"
                name="file"
                type="file"
                required
                className="w-full text-sm text-gray-400"
              />
            </div>

            <div>
              <label htmlFor="doc-type" className="block text-xs font-medium text-gray-400 mb-1">Type</label>
              <select
                id="doc-type"
                name="type"
                defaultValue="QUOTE"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-500"
              >
                <option value="QUOTE">Quote</option>
                <option value="EL">EL</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label htmlFor="doc-status" className="block text-xs font-medium text-gray-400 mb-1">Status</label>
              <select
                id="doc-status"
                name="docStatus"
                defaultValue="DRAFT"
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-500"
              >
                <option value="DRAFT">Draft</option>
                <option value="FINAL">Final</option>
              </select>
            </div>
          </div>

          {uploadError && (
            <p className="text-xs text-red-400">{uploadError}</p>
          )}

          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" disabled={uploading}>
              {uploading ? "Uploading…" : "Upload File"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      )}

      {/* Filter tabs */}
      <div className="flex gap-1 mb-3">
        {TYPE_FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              filter === f
                ? "bg-gray-600 text-gray-100"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {f === "ALL" ? "All" : DOC_TYPE_LABELS[f]}
            {f === "ALL" && (
              <span className="ml-1 text-gray-400">{documents.length}</span>
            )}
            {f !== "ALL" && (
              <span className="ml-1 opacity-60">
                {documents.filter((d) => d.type === f).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Document list */}
      {filtered.length === 0 ? (
        <p className="text-sm text-gray-400 py-4">No documents yet.</p>
      ) : (
        <div className="border border-gray-700 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-800/50 border-b border-gray-700">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400">Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 hidden sm:table-cell">Size</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 hidden md:table-cell">Uploaded by</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-400 hidden md:table-cell">Date</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filtered.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-800/50">
                  <DocNameCell
                    doc={doc}
                    onViewPdf={() => setPdfViewer({ id: doc.id, name: doc.displayName })}
                  />
                  <td className="px-4 py-3">{docTypeBadge(doc.type)}</td>
                  <td className="px-4 py-3">{docStatusBadge(doc.docStatus)}</td>
                  <td className="px-4 py-3 text-gray-400 hidden sm:table-cell">{formatBytes(doc.size)}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{doc.uploadedBy.name}</td>
                  <td className="px-4 py-3 text-gray-400 hidden md:table-cell">{formatDate(doc.uploadedAt)}</td>
                  <DocActionCell
                    downloadHref={`/api/files/${doc.id}`}
                    originalName={doc.originalName}
                    onDelete={isAdmin ? () => handleDelete(doc.id, doc.displayName) : null}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {pdfViewer && (
        <PdfViewerModal
          fileUrl={`/api/files/${pdfViewer.id}`}
          docName={pdfViewer.name}
          onClose={() => setPdfViewer(null)}
        />
      )}
    </div>
  )
}
