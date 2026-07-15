"use client"

import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/shared/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
  readonly page: number
  readonly total: number
  readonly perPage: number
  readonly onPageChange: (page: number) => void
  readonly onPerPageChange: (perPage: number) => void
  readonly perPageOptions?: readonly number[]
}

const DEFAULT_OPTIONS = [10, 25, 50] as const

// ─── Component ───────────────────────────────────────────────────────────────

export function ClientPagination({
  page,
  total,
  perPage,
  onPageChange,
  onPerPageChange,
  perPageOptions = DEFAULT_OPTIONS,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const from = total === 0 ? 0 : (page - 1) * perPage + 1
  const to = Math.min(page * perPage, total)

  if (total === 0) return null

  return (
    <div className="flex items-center justify-between mt-4 px-1">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <span>Rows per page:</span>
        <select
          value={perPage}
          onChange={(e) => { onPerPageChange(Number(e.target.value)); onPageChange(1) }}
          className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-gray-400 bg-white"
        >
          {perPageOptions.map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-sm text-gray-500">
          {from}–{to} of {total}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            className={cn(
              "p-1.5 rounded-lg border border-gray-300 transition-colors",
              page <= 1 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"
            )}
          >
            <ChevronLeft size={14} />
          </button>
          <span className="text-sm text-gray-500 px-1">
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => onPageChange(page + 1)}
            className={cn(
              "p-1.5 rounded-lg border border-gray-300 transition-colors",
              page >= totalPages ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-50"
            )}
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}
