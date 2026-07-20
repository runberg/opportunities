import { truncateFilename } from "@/shared/lib/utils"
import { FileTypeIcon } from "@/shared/components/ui/file-type-icon"
import { EXCEL_MIMES, WORD_DOCX_MIME, isViewableMime } from "@/shared/lib/file-types"

type DocNameCellDoc = {
  displayName: string
  originalName: string
  mimeType: string
}

function viewTitle(mimeType: string): string {
  if (mimeType === "application/pdf") return "Click to view PDF"
  if (EXCEL_MIMES.has(mimeType)) return "Click to view spreadsheet"
  if (mimeType === WORD_DOCX_MIME) return "Click to view document"
  return "Click to view"
}

export function DocNameCell({
  doc,
  onView,
  className = "px-4 py-3",
}: {
  readonly doc: DocNameCellDoc
  readonly onView?: () => void
  readonly className?: string
}) {
  let nameEl: React.ReactNode
  if (isViewableMime(doc.mimeType) && onView) {
    nameEl = (
      <button
        type="button"
        onClick={onView}
        title={viewTitle(doc.mimeType)}
        className="font-medium text-gray-100 truncate block text-left w-full cursor-pointer hover:underline"
      >
        {doc.displayName}
      </button>
    )
  } else {
    nameEl = <div className="font-medium text-gray-100 truncate">{doc.displayName}</div>
  }

  return (
    <td className={`max-w-xs ${className}`}>
      <div className="flex items-start gap-2 min-w-0">
        <FileTypeIcon mimeType={doc.mimeType} />
        <div className="min-w-0">
          {nameEl}
          <div className="text-xs text-gray-400 font-normal truncate">{truncateFilename(doc.originalName)}</div>
        </div>
      </div>
    </td>
  )
}
