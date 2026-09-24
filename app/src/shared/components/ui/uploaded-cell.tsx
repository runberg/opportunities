import { displayName, formatDate, initials } from "@/shared/lib/utils"

/** Compact "who and when" cell: the date, plus the uploader's initials with the full name on hover. */
export function UploadedCell({
  uploadedBy,
  uploadedAt,
  className = "px-4 py-3",
}: {
  readonly uploadedBy: { name: string } | null | undefined
  readonly uploadedAt: Date | string
  readonly className?: string
}) {
  const fullName = uploadedBy ? displayName(uploadedBy.name) : "Unknown"
  return (
    <td className={`text-gray-400 whitespace-nowrap ${className}`}>
      <div className="flex items-center gap-2">
        <span
          title={fullName}
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-700 text-[10px] font-semibold text-gray-200"
        >
          {uploadedBy ? initials(uploadedBy.name) : "?"}
        </span>
        <span>{formatDate(uploadedAt)}</span>
      </div>
    </td>
  )
}
