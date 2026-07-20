"use client"

import { useEffect, useState } from "react"
import { ViewerShell } from "./viewer-shell"

interface WordViewerModalProps {
  readonly fileUrl: string
  readonly docName: string
  readonly onClose: () => void
}

export function WordViewerModal({ fileUrl, docName, onClose }: WordViewerModalProps) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    let url: string | null = null

    fetch(`${fileUrl}?preview=1`, { signal: controller.signal })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error("Failed"))))
      .then((blob) => {
        url = URL.createObjectURL(blob)
        setBlobUrl(url)
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== "AbortError") setLoadError(true)
      })

    return () => {
      controller.abort()
      if (url) URL.revokeObjectURL(url)
    }
  }, [fileUrl])

  return (
    <ViewerShell fileUrl={fileUrl} docName={docName} onClose={onClose}>
      <div className="flex-1 overflow-hidden flex items-center justify-center bg-gray-800">
        {loadError && <p className="text-gray-400 text-sm">Failed to load document.</p>}
        {!loadError && !blobUrl && <p className="text-gray-500 text-sm">Converting…</p>}
        {blobUrl && <iframe src={blobUrl} className="w-full h-full border-0" title={docName} />}
      </div>
    </ViewerShell>
  )
}
