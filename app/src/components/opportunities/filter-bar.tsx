"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { Search, ChevronDown, Check, X, Download } from "lucide-react"
import { cn, STATUS_GROUPS, STATUS_LABELS } from "@/lib/utils"

type StatusGroup = { label: string; statuses: string[] }

export function FilterBar({
  basePath = "/opportunities",
  statusGroups = STATUS_GROUPS,
  exportType,
}: {
  basePath?: string
  statusGroups?: StatusGroup[]
  exportType?: "quotes" | "els" | "production"
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  const query = searchParams.get("q") ?? ""
  const statusParam = searchParams.get("status") ?? ""

  const selectedStatuses = statusParam ? statusParam.split(",").filter(Boolean) : []

  const [inputValue, setInputValue] = useState(query)

  // Sync when query changes externally (e.g. "Clear all")
  useEffect(() => {
    setInputValue(query)
  }, [query])

  // Debounced dynamic search: fire when empty or ≥3 chars
  useEffect(() => {
    if (inputValue.length > 0 && inputValue.length < 3) return
    const timer = setTimeout(() => {
      updateParams({ q: inputValue || null })
    }, 350)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (statusRef.current && !statusRef.current.contains(target)) setStatusOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    // Reset to page 1 whenever a filter (not page navigation) changes
    if (!("page" in updates)) params.delete("page")
    const qs = params.toString()
    router.push(`${basePath}${qs ? `?${qs}` : ""}`)
  }

  function toggleStatus(s: string) {
    const next = selectedStatuses.includes(s)
      ? selectedStatuses.filter((x) => x !== s)
      : [...selectedStatuses, s]
    updateParams({ status: next.length > 0 ? next.join(",") : null })
  }

  const statusLabel =
    selectedStatuses.length === 0
      ? "All Statuses"
      : selectedStatuses.length === 1
      ? (STATUS_LABELS[selectedStatuses[0]] ?? selectedStatuses[0])
      : `${selectedStatuses.length} statuses`

  const hasFilters = query || statusParam

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Search */}
      <div className="flex-1 min-w-48 relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Search by title, customer, ID, reference…"
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
      </div>

      {/* Status multi-select */}
      <div ref={statusRef} className="relative">
        <button
          type="button"
          onClick={() => setStatusOpen((o) => !o)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none",
            selectedStatuses.length > 0
              ? "border-[#006fff] bg-[#006fff] text-white"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          )}
        >
          {statusLabel}
          <ChevronDown
            size={14}
            className={cn("transition-transform flex-shrink-0", statusOpen && "rotate-180")}
          />
        </button>

        {statusOpen && (
          <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1.5">
            {selectedStatuses.length > 0 && (
              <button
                type="button"
                onClick={() => updateParams({ status: null })}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-2"
              >
                <X size={12} />
                Clear selection
              </button>
            )}
            {statusGroups.map((group) => (
              <div key={group.label}>
                <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  {group.label}
                </div>
                {group.statuses.map((s) => {
                  const checked = selectedStatuses.includes(s)
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleStatus(s)}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                    >
                      <span
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                          checked ? "bg-gray-900 border-gray-900" : "border-gray-300"
                        )}
                      >
                        {checked && <Check size={10} className="text-white" />}
                      </span>
                      {STATUS_LABELS[s]}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push(basePath)}
          className="px-4 py-2 text-gray-500 text-sm rounded-lg hover:bg-gray-100 transition-colors"
        >
          Clear all
        </button>
      )}

      {exportType && (
        <a
          href={`/api/export?type=${exportType}` + (query ? `&q=${encodeURIComponent(query)}` : "") + (statusParam ? `&status=${encodeURIComponent(statusParam)}` : "")}
          download
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg text-sm transition-colors ml-auto"
        >
          <Download size={14} />
          Export CSV
        </a>
      )}
    </div>
  )
}
