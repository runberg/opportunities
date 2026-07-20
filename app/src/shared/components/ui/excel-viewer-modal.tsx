"use client"

import { useEffect, useRef, useState } from "react"
import { ViewerShell } from "./viewer-shell"
import type { SheetInfo } from "@/shared/lib/excel-preview"

interface ExcelViewerModalProps {
  readonly fileUrl: string
  readonly docName: string
  readonly onClose: () => void
}

export function ExcelViewerModal({ fileUrl, docName, onClose }: ExcelViewerModalProps) {
  const [sheets, setSheets] = useState<SheetInfo[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [pdfLoading, setPdfLoading] = useState(false)
  const [listError, setListError] = useState(false)
  const [pdfError, setPdfError] = useState(false)

  // Track all created blob URLs for cleanup on unmount / fileUrl change
  const allBlobUrls = useRef<string[]>([])

  // Load sheet list
  useEffect(() => {
    setSheets([])
    setActiveSheet(0)
    setBlobUrl(null)
    setListLoading(true)
    setListError(false)
    setPdfError(false)
    allBlobUrls.current.forEach((u) => URL.revokeObjectURL(u))
    allBlobUrls.current = []

    const controller = new AbortController()

    fetch(`${fileUrl}?preview=1`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("Failed"))))
      .then((data: { sheets: SheetInfo[] }) => setSheets(data.sheets))
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== "AbortError") setListError(true)
      })
      .finally(() => setListLoading(false))

    return () => controller.abort()
  }, [fileUrl])

  // Load PDF for the active sheet whenever it changes
  useEffect(() => {
    if (sheets.length === 0) return

    const controller = new AbortController()
    let url: string | null = null

    setBlobUrl(null)
    setPdfLoading(true)
    setPdfError(false)

    fetch(`${fileUrl}?preview=1&sheet=${activeSheet}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.blob() : Promise.reject(new Error("Failed"))))
      .then((blob) => {
        url = URL.createObjectURL(blob)
        allBlobUrls.current.push(url)
        setBlobUrl(url)
      })
      .catch((err: unknown) => {
        if ((err as { name?: string }).name !== "AbortError") setPdfError(true)
      })
      .finally(() => { if (!controller.signal.aborted) setPdfLoading(false) })

    return () => {
      controller.abort()
      // Revoke only the URL created in this effect invocation
      if (url) {
        URL.revokeObjectURL(url)
        allBlobUrls.current = allBlobUrls.current.filter((u) => u !== url)
      }
    }
  }, [fileUrl, sheets.length, activeSheet])

  const tabs = sheets.length > 1 ? (
    <div className="flex gap-1 px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0 overflow-x-auto">
      {sheets.map((s) => (
        <button
          key={s.index}
          type="button"
          onClick={() => setActiveSheet(s.index)}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
            s.index === activeSheet
              ? "bg-white text-gray-900"
              : "text-gray-300 hover:text-white hover:bg-white/10"
          }`}
        >
          {s.name}
        </button>
      ))}
    </div>
  ) : undefined

  return (
    <ViewerShell fileUrl={fileUrl} docName={docName} onClose={onClose} tabs={tabs}>
      <div className="flex-1 overflow-hidden flex items-center justify-center bg-gray-800">
        {listLoading && <p className="text-gray-500 text-sm">Loading…</p>}
        {listError && <p className="text-gray-400 text-sm">Failed to load file.</p>}
        {!listLoading && !listError && pdfLoading && (
          <p className="text-gray-500 text-sm">Converting sheet…</p>
        )}
        {!listLoading && !listError && pdfError && (
          <p className="text-gray-400 text-sm">Failed to convert sheet.</p>
        )}
        {blobUrl && (
          <iframe src={blobUrl} className="w-full h-full border-0" title={docName} />
        )}
      </div>
    </ViewerShell>
  )
}
