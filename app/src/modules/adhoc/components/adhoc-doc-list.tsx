"use client"

import { DocNameCell } from "@/shared/components/ui/doc-name-cell"
import { DocActionCell } from "@/shared/components/ui/doc-action-cell"
import { formatBytes, formatDate } from "@/shared/lib/utils"

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
        <p className="text-xs font-medium text-gray-400 uppercase mb-1.5">{label}</p>
        <p className="text-xs text-gray-500 italic">{emptyText}</p>
      </div>
    )
  }
  return (
    <div className="mb-3">
      <p className="text-xs font-medium text-gray-400 uppercase mb-1.5">{label}</p>
      <div className="border border-gray-700 rounded-xl overflow-hidden">
        <table className="w-full text-sm table-fixed">
          <tbody className="divide-y divide-gray-700">
            {docs.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-800/50">
                <DocNameCell
                  doc={doc}
                  onViewPdf={() => onView(doc)}
                />
                <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap hidden md:table-cell w-64">
                  {formatBytes(doc.size)} · {doc.uploadedBy?.name ?? "Unknown"} · {formatDate(doc.uploadedAt)}
                </td>
                <DocActionCell
                  downloadHref={downloadUrl(doc.id)}
                  originalName={doc.originalName}
                  onDelete={canDelete(doc) ? () => onDelete(doc.id) : null}
                  className="px-4 py-3 w-24"
                />
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
