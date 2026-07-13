"use client"

import { useEffect, useState } from "react"
import { X, Download } from "lucide-react"

interface PdfViewerModalProps {
  readonly fileUrl: string
  readonly docName: string
  readonly onClose: () => void
}

export function PdfViewerModal({ fileUrl, docName, onClose }: PdfViewerModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    let url: string | null = null

    async function load() {
      try {
        const res = await fetch(`${fileUrl}?inline=1`)
        if (!res.ok) { setLoadError(true); return }
        const blob = await res.blob()
        url = URL.createObjectURL(blob)
        setBlobUrl(url)
      } catch {
        setLoadError(true)
      }
    }

    void load()

    return () => { if (url) URL.revokeObjectURL(url) }
  }, [fileUrl])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/90">
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-900 text-white shrink-0">
        <span className="text-sm font-medium text-gray-100 truncate">{docName}</span>
        <div className="flex items-center gap-2 shrink-0">
          <a
            href={fileUrl}
            download={docName}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <Download size={14} />
            Download
          </a>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={14} />
            Close
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex items-center justify-center bg-gray-800">
        {loadError && <p className="text-gray-400 text-sm">Failed to load PDF.</p>}
        {!loadError && blobUrl && (
          <iframe src={blobUrl} className="w-full h-full border-0" title={docName} />
        )}
        {!loadError && !blobUrl && <p className="text-gray-500 text-sm">Loading…</p>}
      </div>
    </div>
  )
}
