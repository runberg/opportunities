"use client"

import { useEffect, useState } from "react"
import { ViewerShell } from "./viewer-shell"
import type { SheetPreview } from "@/shared/lib/excel-preview"

interface ExcelViewerModalProps {
  readonly fileUrl: string
  readonly docName: string
  readonly onClose: () => void
}

export function ExcelViewerModal({ fileUrl, docName, onClose }: ExcelViewerModalProps) {
  const [sheets, setSheets] = useState<SheetPreview[]>([])
  const [activeSheet, setActiveSheet] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  useEffect(() => {
    setSheets([])
    setActiveSheet(0)
    setLoading(true)
    setLoadError(false)

    async function load() {
      try {
        const res = await fetch(`${fileUrl}?preview=1`)
        if (!res.ok) { setLoadError(true); return }
        const data = await res.json() as { sheets: SheetPreview[] }
        setSheets(data.sheets)
      } catch {
        setLoadError(true)
      } finally {
        setLoading(false)
      }
    }
    void load()
  }, [fileUrl])

  const tabs = sheets.length > 1 ? (
    <div className="flex gap-1 px-3 py-2 bg-gray-800 border-b border-gray-700 shrink-0 overflow-x-auto">
      {sheets.map((s, i) => (
        <button
          key={s.name}
          type="button"
          onClick={() => setActiveSheet(i)}
          className={`px-3 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap ${
            i === activeSheet
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
      {/* Explicit light-mode styles prevent dark-theme inheritance */}
      <div className="flex-1 overflow-auto" style={{ backgroundColor: '#ffffff', color: '#111827', colorScheme: 'light' }}>
        {loading && (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: '#6b7280' }} className="text-sm">Loading…</p>
          </div>
        )}
        {loadError && (
          <div className="flex items-center justify-center h-full">
            <p style={{ color: '#9ca3af' }} className="text-sm">Failed to load file.</p>
          </div>
        )}
        {!loading && !loadError && sheets[activeSheet] && (
          <div className="p-4 min-w-max">
            {/* HTML is server-generated from stored files — not user-injected */}
            <div dangerouslySetInnerHTML={{ __html: sheets[activeSheet].html }} />
          </div>
        )}
      </div>
    </ViewerShell>
  )
}
