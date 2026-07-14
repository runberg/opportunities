import { truncateFilename } from "@/shared/lib/utils"
import { FileTypeIcon } from "@/shared/components/ui/file-type-icon"

type DocNameCellDoc = {
  displayName: string
  originalName: string
  mimeType: string
}

export function DocNameCell({
  doc,
  onViewPdf,
  className = "px-4 py-3",
}: {
  readonly doc: DocNameCellDoc
  readonly onViewPdf: () => void
  readonly className?: string
}) {
  return (
    <td className={`max-w-xs ${className}`}>
      <div className="flex items-start gap-2 min-w-0">
        <FileTypeIcon mimeType={doc.mimeType} />
        <div className="min-w-0">
          {doc.mimeType === "application/pdf" ? (
            <button
              type="button"
              onClick={onViewPdf}
              title="Click to view PDF"
              className="font-medium text-gray-100 truncate block text-left w-full cursor-pointer hover:underline"
            >
              {doc.displayName}
            </button>
          ) : (
            <div className="font-medium text-gray-100 truncate">{doc.displayName}</div>
          )}
          <div className="text-xs text-gray-400 font-normal">{truncateFilename(doc.originalName)}</div>
        </div>
      </div>
    </td>
  )
}
