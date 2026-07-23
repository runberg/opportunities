"use client"

import { useState } from "react"
import { Download, Trash2 } from "lucide-react"

async function triggerDownload(href: string, filename: string) {
  const res = await fetch(href)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export function DocActionCell({
  downloadHref,
  originalName,
  onDelete,
  className = "px-4 py-3",
}: {
  readonly downloadHref: string
  readonly originalName: string
  readonly onDelete: (() => void) | null
  readonly className?: string
}) {
  const [downloading, setDownloading] = useState(false)

  async function handleDownload() {
    setDownloading(true)
    try {
      await triggerDownload(downloadHref, originalName)
    } finally {
      setDownloading(false)
    }
  }

  return (
    <td className={className}>
      <div className="flex items-center gap-1 justify-end">
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloading}
          className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
          title="Download"
        >
          <Download size={15} />
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={15} />
          </button>
        )}
      </div>
    </td>
  )
}
