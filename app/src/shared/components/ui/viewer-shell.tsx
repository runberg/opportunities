"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X, Download } from "lucide-react"

interface ViewerShellProps {
  readonly fileUrl: string
  readonly docName: string
  readonly onClose: () => void
  readonly tabs?: React.ReactNode
  readonly children: React.ReactNode
}

export function ViewerShell({ fileUrl, docName, onClose, tabs, children }: ViewerShellProps) {
  const [mounted, setMounted] = useState(false)
  const dialogRef = useRef<HTMLDialogElement>(null)
  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!mounted) return
    const dialog = dialogRef.current
    dialog?.showModal()
    return () => dialog?.close()
  }, [mounted])

  if (!mounted) return null

  // Escape parent overflow and stacking contexts, including package drawers.
  return createPortal(
    <dialog
      ref={dialogRef}
      aria-label={docName}
      onCancel={(event) => { event.preventDefault(); onClose() }}
      onKeyDown={(event) => { if (event.key === "Escape") event.stopPropagation() }}
      className="fixed inset-0 m-0 h-dvh w-screen max-h-none max-w-none border-0 p-0 hidden open:flex flex-col bg-black/90 backdrop:bg-black/90"
    >
      <div className="flex items-center justify-between gap-4 px-4 py-3 bg-gray-900 text-white shrink-0">
        <span className="text-sm font-medium text-gray-100 truncate" title={docName}>{docName}</span>
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
    </dialog>,
    document.body
  )
}
