import { truncateFilename } from "@/shared/lib/utils"
import { FileTypeIcon } from "@/shared/components/ui/file-type-icon"

const EXCEL_MIMES = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

// Only .docx is supported for preview; old binary .doc is download-only
const WORD_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

type DocNameCellDoc = {
  displayName: string
  originalName: string
  mimeType: string
}

export function DocNameCell({
  doc,
  onViewPdf,
  onViewExcel,
  onViewWord,
  className = "px-4 py-3",
}: {
  readonly doc: DocNameCellDoc
  readonly onViewPdf?: () => void
  readonly onViewExcel?: () => void
  readonly onViewWord?: () => void
  readonly className?: string
}) {
  const isPdf = doc.mimeType === "application/pdf"
  const isExcel = EXCEL_MIMES.has(doc.mimeType)
  const isDocx = doc.mimeType === WORD_DOCX_MIME

  let nameEl: React.ReactNode
  if (isPdf && onViewPdf) {
    nameEl = (
      <button
        type="button"
        onClick={onViewPdf}
        title="Click to view PDF"
        className="font-medium text-gray-100 truncate block text-left w-full cursor-pointer hover:underline"
      >
        {doc.displayName}
      </button>
    )
  } else if (isExcel && onViewExcel) {
    nameEl = (
      <button
        type="button"
        onClick={onViewExcel}
        title="Click to view spreadsheet"
        className="font-medium text-gray-100 truncate block text-left w-full cursor-pointer hover:underline"
      >
        {doc.displayName}
      </button>
    )
  } else if (isDocx && onViewWord) {
    nameEl = (
      <button
        type="button"
        onClick={onViewWord}
        title="Click to view document"
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
