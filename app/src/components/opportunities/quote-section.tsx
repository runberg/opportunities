"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, Download, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatBytes, formatDate } from "@/lib/utils"

interface QuoteDoc {
  id: string
  displayName: string
  originalName: string
  size: number
  docStatus: string
  uploadedAt: Date | string
  uploadedBy: { id: string; name: string }
}

interface QuoteSectionProps {
  opportunityId: string
  documents: QuoteDoc[]
  currentUserId: string
  isAdmin: boolean
  onRefresh?: () => void
  docType?: "QUOTE" | "EL"
}

export function QuoteSection({
  opportunityId,
  documents,
  currentUserId,
  isAdmin,
  onRefresh,
  docType = "QUOTE",
}: QuoteSectionProps) {
  const router = useRouter()

  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    formData.set("type", docType)
    setUploading(true)
    setUploadError("")

    const res = await fetch(`/api/opportunities/${opportunityId}/documents`, {
      method: "POST",
      body: formData,
    })

    setUploading(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setUploadError(data.error ?? "Upload failed.")
      return
    }

    setShowUpload(false)
    ;(e.target as HTMLFormElement).reset()
    onRefresh?.()
    router.refresh()
  }

  async function handleDelete(docId: string, docName: string) {
    if (!confirm(`Delete "${docName}"? This cannot be undone.`)) return
    await fetch(`/api/files/${docId}`, { method: "DELETE" })
    onRefresh?.()
    router.refresh()
  }

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">
        {docType === "EL" ? "EL Documents" : "Quote Documents"}
      </h2>

      {/* Documents */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">
            {docType === "EL" ? "EL Documents" : "Quote Documents"}
            <span className="ml-1.5 text-gray-400 font-normal">({documents.length})</span>
          </p>
          <Button variant="secondary" size="sm" onClick={() => setShowUpload((v) => !v)}>
            <Upload size={13} className="mr-1.5" />
            {docType === "EL" ? "Upload EL" : "Upload Quote"}
          </Button>
        </div>

        {showUpload && (
          <form
            onSubmit={handleUpload}
            className="mb-4 p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-3"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Document Name *
                </label>
                <input
                  name="displayName"
                  required
                  placeholder="e.g. Quote v1 — ACME"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">File *</label>
                <input
                  name="file"
                  type="file"
                  required
                  className="w-full text-sm text-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Version</label>
                <select
                  name="docStatus"
                  defaultValue="DRAFT"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="FINAL">Final</option>
                </select>
              </div>
            </div>
            {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={uploading}>
                {uploading ? "Uploading…" : "Upload"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowUpload(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}

        {documents.length === 0 ? (
          <p className="text-sm text-gray-400">
            {docType === "EL" ? "No EL documents yet." : "No quote documents yet."}
          </p>
        ) : (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">
                    Name
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">
                    Version
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 hidden sm:table-cell">
                    Size
                  </th>
                  <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 hidden md:table-cell">
                    Uploaded
                  </th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900 max-w-xs truncate">
                      {doc.displayName}
                      <div className="text-xs text-gray-400 font-normal truncate">
                        {doc.originalName}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${
                          doc.docStatus === "FINAL"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {doc.docStatus === "FINAL" ? "Final" : "Draft"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">
                      {formatBytes(doc.size)}
                    </td>
                    <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                      {doc.uploadedBy.name} · {formatDate(doc.uploadedAt)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        <a
                          href={`/api/files/${doc.id}`}
                          download={doc.originalName}
                          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                          title="Download"
                        >
                          <Download size={15} />
                        </a>
                        {(isAdmin || doc.uploadedBy.id === currentUserId) && (
                          <button
                            type="button"
                            onClick={() => handleDelete(doc.id, doc.displayName)}
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
        )}
      </div>

    </div>
  )
}
