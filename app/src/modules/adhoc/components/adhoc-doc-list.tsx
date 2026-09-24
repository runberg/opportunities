"use client"

import { Fragment, useState } from "react"
import { DocEditForm, type DocTypeOption } from "@/shared/components/ui/doc-edit-form"
import { DocNameCell } from "@/shared/components/ui/doc-name-cell"
import { DocActionCell } from "@/shared/components/ui/doc-action-cell"
import { formatBytes, formatDate } from "@/shared/lib/utils"

export type AdhocDocItem = {
  id: string
  displayName: string
  originalName: string
  mimeType: string
  size: number
  type?: string
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
  /** When provided, each row gets an edit button (rename / retype) PATCHing this url. */
  readonly editUrl?: (docId: string) => string
  readonly editTypeOptions?: DocTypeOption[]
  readonly onEdited?: () => void | Promise<void>
}

export function AdhocDocList({
  docs,
  label,
  downloadUrl,
  canDelete,
  onDelete,
  onView,
  emptyText,
  editUrl,
  editTypeOptions,
  onEdited,
}: AdhocDocListProps) {
  const [editingId, setEditingId] = useState<string | null>(null)
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
              <Fragment key={doc.id}>
              <tr className="hover:bg-gray-800/50">
                <DocNameCell
                  doc={doc}
                  onView={() => onView(doc)}
                />
                <td className="px-4 py-3 text-xs text-gray-400 hidden md:table-cell w-48">
                  <div className="truncate" title={doc.uploadedBy?.name ?? "Unknown"}>{doc.uploadedBy?.name ?? "Unknown"}</div>
                  <div className="mt-0.5 truncate">{formatBytes(doc.size)} · {formatDate(doc.uploadedAt)}</div>
                </td>
                <DocActionCell
                  downloadHref={downloadUrl(doc.id)}
                  originalName={doc.originalName}
                  onDelete={canDelete(doc) ? () => onDelete(doc.id) : null}
                  onEdit={editUrl ? () => setEditingId(doc.id) : null}
                  className="px-4 py-3 w-28"
                />
              </tr>
              {editUrl && editingId === doc.id && (
                <tr>
                  <td colSpan={3} className="p-0">
                    <DocEditForm
                      url={editUrl(doc.id)}
                      initialName={doc.displayName}
                      initialType={doc.type ?? ""}
                      typeOptions={editTypeOptions ?? null}
                      onCancel={() => setEditingId(null)}
                      onSaved={async () => { setEditingId(null); await onEdited?.() }}
                    />
                  </td>
                </tr>
              )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
