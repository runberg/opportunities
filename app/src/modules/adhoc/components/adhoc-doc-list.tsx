"use client"

import { Download, Trash2 } from "lucide-react"
import { FileTypeIcon } from "@/shared/components/ui/file-type-icon"
import { formatBytes, formatDate, truncateFilename } from "@/shared/lib/utils"

export type AdhocDocItem = {
  id: string
  displayName: string
  originalName: string
  mimeType: string
  size: number
  uploadedAt: string
  uploadedBy: { id: string; name: string }
}

type AdhocDocListProps = {
  readonly docs: AdhocDocItem[]
  readonly label: string
  readonly downloadUrl: (docId: string) => string
  readonly canDelete: (doc: AdhocDocItem) => boolean
  readonly onDelete: (docId: string) => void
  readonly onView: (doc: AdhocDocItem) => void
  readonly emptyText?: string
}

export function AdhocDocList({
  docs,
  label,
  downloadUrl,
  canDelete,
  onDelete,
  onView,
  emptyText,
}: AdhocDocListProps) {
  if (docs.length === 0) {
    if (!emptyText) return null
    return (
      <div className="mb-3">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">{label}</p>
        <p className="text-xs text-gray-400 italic">{emptyText}</p>
      </div>
    )
  }
  return (
    <div className="mb-3">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase mb-1.5">{label}</p>
      <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                <td className="px-3 py-2.5 max-w-xs">
                  <div className="flex items-start gap-2 min-w-0">
                    <FileTypeIcon mimeType={doc.mimeType} />
                    <div className="min-w-0">
                      {doc.mimeType === "application/pdf" ? (
                        <button
                          type="button"
                          onClick={() => onView(doc)}
                          title="Click to view PDF"
                          className="font-medium text-gray-900 dark:text-gray-100 truncate block text-left w-full cursor-pointer hover:underline"
                        >
                          {doc.displayName}
                        </button>
                      ) : (
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{doc.displayName}</div>
                      )}
                      <div className="text-xs text-gray-400">{truncateFilename(doc.originalName)}</div>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-400 whitespace-nowrap hidden md:table-cell">
                  {formatBytes(doc.size)} · {doc.uploadedBy.name} · {formatDate(doc.uploadedAt)}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 justify-end">
                    <a
                      href={downloadUrl(doc.id)}
                      download={doc.originalName}
                      className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                      title="Download"
                    >
                      <Download size={15} />
                    </a>
                    {canDelete(doc) && (
                      <button
                        type="button"
                        onClick={() => onDelete(doc.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
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
    </div>
  )
}
