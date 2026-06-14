"use client"

import { useState, useEffect } from "react"
import type { OppTableRow } from "@/modules/opportunities/components/opportunity-data-table"
import type { SortDir } from "@/shared/components/ui/sortable-header"

export function useDrillState(onClose: () => void) {
  const [query, setQuery] = useState("")
  const [debouncedQuery, setDebouncedQuery] = useState("")
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(50)
  const [sortKey, setSortKey] = useState("title")
  const [sortDir, setSortDir] = useState<SortDir>("asc")
  const [result, setResult] = useState<{ items: OppTableRow[]; total: number } | null>(null)
  const [loading, setLoading] = useState(true)
  const [openId, setOpenId] = useState<string | null>(null)

  function handleSort(key: string, dir: SortDir) { setSortKey(key); setSortDir(dir); setPage(1) }

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedQuery(query); setPage(1) }, 350)
    return () => clearTimeout(t)
  }, [query])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && !openId) onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, openId])

  const items = result?.items ?? []
  const total = result?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / perPage))

  return {
    query, setQuery,
    debouncedQuery,
    page, setPage,
    perPage, setPerPage,
    sortKey, sortDir,
    handleSort,
    loading, setLoading,
    setResult,
    openId, setOpenId,
    items, total, totalPages,
  }
}

export function ModalPagination({
  total, perPage, page, totalPages, onPageChange, onPerPageChange,
}: {
  readonly total: number
  readonly perPage: number
  readonly page: number
  readonly totalPages: number
  readonly onPageChange: (page: number) => void
  readonly onPerPageChange: (perPage: number) => void
}) {
  if (total <= perPage) return null
  return (
    <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span>Rows per page:</span>
        <select
          value={perPage}
          onChange={(e) => { onPerPageChange(Number(e.target.value)); onPageChange(1) }}
          className="border border-gray-300 rounded px-1 py-0.5 focus:outline-none"
        >
          {[25, 50, 100].map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <span className="ml-2">
          {Math.min((page - 1) * perPage + 1, total)}–{Math.min(page * perPage, total)} of {total}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors"
        >
          ← Prev
        </button>
        <span className="text-xs text-gray-500">Page {page} of {totalPages}</span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-40 transition-colors"
        >
          Next →
        </button>
      </div>
    </div>
  )
}
