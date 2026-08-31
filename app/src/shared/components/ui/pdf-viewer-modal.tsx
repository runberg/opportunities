"use client"

import { useEffect, useState } from "react"
import { ViewerShell } from "./viewer-shell"
import { sanitizeFilename } from "@/shared/lib/utils"

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
        // Named as a File (not a bare Blob) so the browser's built-in PDF viewer
        // suggests a real filename on save/download instead of the blob's UUID.
        const file = new File([blob], `${sanitizeFilename(docName)}.pdf`, { type: "application/pdf" })
        url = URL.createObjectURL(file)
        setBlobUrl(url)
      } catch {
        setLoadError(true)
      }
    }

    void load()

    return () => { if (url) URL.revokeObjectURL(url) }
  }, [fileUrl])

  return (
    <ViewerShell fileUrl={fileUrl} docName={docName} onClose={onClose}>
      <div className="flex-1 overflow-hidden flex items-center justify-center bg-gray-800">
        {loadError && <p className="text-gray-400 text-sm">Failed to load PDF.</p>}
        {!loadError && blobUrl && (
          <iframe src={blobUrl} className="w-full h-full border-0" title={docName} />
        )}
        {!loadError && !blobUrl && <p className="text-gray-500 text-sm">Loading…</p>}
      </div>
    </ViewerShell>
  )
}
