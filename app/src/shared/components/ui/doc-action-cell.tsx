import { Download, Trash2 } from "lucide-react"

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
  return (
    <td className={className}>
      <div className="flex items-center gap-1 justify-end">
        <a
          href={downloadHref}
          download={originalName}
          className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded transition-colors"
          title="Download"
        >
          <Download size={15} />
        </a>
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
