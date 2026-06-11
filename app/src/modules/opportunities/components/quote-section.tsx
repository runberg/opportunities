"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Upload, Download, Trash2, FileUp } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn, formatBytes, formatDate } from "@/shared/lib/utils"

interface QuoteDoc {
  id: string
  displayName: string
  originalName: string
  size: number
  docStatus: string
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
  const [displayName, setDisplayName] = useState("")
  const [docStatus, setDocStatus] = useState("DRAFT")
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function nameFromFile(f: File): string {
    return f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim()
  }

  function applyFile(f: File) {
    setFile(f)
    // Auto-fill name only if the user hasn't typed one
    setDisplayName((prev) => (prev.trim() === "" ? nameFromFile(f) : prev))
  }

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const onDragLeave = useCallback(() => setDragging(false), [])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const f = e.dataTransfer.files[0]
    if (f) applyFile(f)
  }, [])

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!file) return
    const formData = new FormData()
    formData.set("file", file)
    formData.set("displayName", displayName.trim())
    formData.set("docStatus", docStatus)
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
    setDisplayName("")
    setDocStatus("DRAFT")
    setFile(null)
    onRefresh?.()
    router.refresh()
  }

  async function handleDelete(docId: string, docName: string) {
    if (!confirm(`Delete "${docName}"? This cannot be undone.`)) return
    await fetch(`/api/files/${docId}`, { method: "DELETE" })
    onRefresh?.()
    router.refresh()
  }

  const { section: sectionLabel, empty: emptyLabel } = DOC_TYPE_LABELS[docType]

  let dropZoneBorderCls: string
  if (dragging) dropZoneBorderCls = "border-[#006fff] bg-blue-50"
  else if (file) dropZoneBorderCls = "border-green-400 bg-green-50"
  else dropZoneBorderCls = "border-gray-300 hover:border-gray-400"

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      {/* Documents */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-gray-700">
            {sectionLabel}
            <span className="ml-1.5 text-gray-400 font-normal">({documents.length})</span>
          </p>
          <Button variant="secondary" size="sm" onClick={() => setShowUpload((v) => !v)}>
            <Upload size={13} className="mr-1.5" />
            Upload
          </Button>
        </div>

        {showUpload && (
          <form
            onSubmit={handleUpload}
            className="mb-4 p-4 border border-gray-200 rounded-xl bg-gray-50"
          >
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Left: fields */}
              <div className="flex flex-col gap-3 sm:w-56 shrink-0">
                <div>
                  <label htmlFor="qs-doc-name" className="block text-xs font-medium text-gray-600 mb-1">
                    Document Name *
                  </label>
                  <input
                    id="qs-doc-name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    required
                    placeholder="e.g. Quote v1 — ACME"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                  />
                </div>
                <div>
                  <label htmlFor="qs-doc-version" className="block text-xs font-medium text-gray-600 mb-1">Version</label>
                  <select
                    id="qs-doc-version"
                    value={docStatus}
                    onChange={(e) => setDocStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
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
                    onClick={() => { setShowUpload(false); setFile(null); setDisplayName("") }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>

              {/* Right: drop zone */}
              <button
                type="button"
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => fileInputRef.current?.click()}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-colors min-h-[120px]",
                  dropZoneBorderCls
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
                    <FileUp size={20} className="text-green-600" />
                    <p className="text-sm font-medium text-green-700 text-center px-3">{file.name}</p>
                    <p className="text-xs text-gray-400">{formatBytes(file.size)} · click to change</p>
                  </>
                ) : (
                  <>
                    <FileUp size={20} className={dragging ? "text-[#006fff]" : "text-gray-400"} />
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

        {documents.length === 0 ? (
          <p className="text-sm text-gray-400">
            {emptyLabel}
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
