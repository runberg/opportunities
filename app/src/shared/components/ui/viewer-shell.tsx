"use client"

import { useEffect } from "react"
import { X, Download } from "lucide-react"

interface ViewerShellProps {
  readonly fileUrl: string
  readonly docName: string
  readonly onClose: () => void
  readonly tabs?: React.ReactNode
  readonly children: React.ReactNode
}

export function ViewerShell({ fileUrl, docName, onClose, tabs, children }: ViewerShellProps) {
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
      {tabs}
      {children}
    </div>
  )
}
