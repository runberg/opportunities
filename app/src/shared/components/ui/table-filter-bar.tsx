"use client"

import { useState, useRef, useEffect } from "react"
import { Search, ChevronDown, Check, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusItem = { value: string; label: string }
export type FilterStatusGroup = { label: string; statuses: StatusItem[] }

type Props = {
  readonly search: string
  readonly onSearchChange: (q: string) => void
  readonly placeholder?: string
  /** Statuses currently hidden — everything else in statusGroups stays visible. An empty
   * array means nothing is hidden (all statuses shown), which is the default state. */
  readonly excludedStatuses: string[]
  readonly onToggleStatus: (s: string) => void
  readonly onShowAll: () => void
  readonly onClearAll: () => void
  readonly statusGroups: FilterStatusGroup[]
  readonly exportNode?: React.ReactNode
}

// ─── Component ───────────────────────────────────────────────────────────────

export function TableFilterBar({
  search,
  onSearchChange,
  placeholder = "Search…",
  excludedStatuses,
  onToggleStatus,
  onShowAll,
  onClearAll,
  statusGroups,
  exportNode,
}: Props) {
  const [statusOpen, setStatusOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (statusRef.current && !statusRef.current.contains(e.target as Node)) {
        setStatusOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const hasFilters = Boolean(search) || excludedStatuses.length > 0

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Search */}
      <div className="flex-1 min-w-48 relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
      </div>

      {/* Status dropdown — checked = visible; uncheck a status to hide just that one */}
      <div ref={statusRef} className="relative">
        <button
          type="button"
          onClick={() => setStatusOpen((o) => !o)}
          className={cn(
            "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none",
            excludedStatuses.length > 0
              ? "border-[#006fff] bg-[#006fff] text-white"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          )}
        >
          Status Filter
          <ChevronDown
            size={14}
            className={cn("transition-transform flex-shrink-0", statusOpen && "rotate-180")}
          />
        </button>

        {statusOpen && (
          <div className="absolute top-full left-0 mt-1 w-max min-w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1.5">
            {excludedStatuses.length > 0 && (
              <button
                type="button"
                onClick={() => { onShowAll(); setStatusOpen(false) }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-2 whitespace-nowrap"
              >
                <X size={12} />
                Show all
              </button>
            )}
            {statusGroups.map((group) => (
              <div key={group.label || "default"}>
                {group.label && (
                  <div className="px-3 py-1.5 text-xs font-semibold text-gray-400 uppercase tracking-wide whitespace-nowrap">
                    {group.label}
                  </div>
                )}
                {group.statuses.map((s) => {
                  const visible = !excludedStatuses.includes(s.value)
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => onToggleStatus(s.value)}
                      className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 whitespace-nowrap"
                    >
                      <span
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0",
                          visible ? "bg-gray-900 border-gray-900" : "border-gray-300"
                        )}
                      >
                        {visible && <Check size={10} className="text-white" />}
                      </span>
                      {s.label}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onClearAll}
        disabled={!hasFilters}
        className={cn(
          "px-4 py-2 border rounded-lg text-sm transition-colors focus:outline-none",
          hasFilters
            ? "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
            : "border-gray-200 bg-white text-gray-300 cursor-not-allowed"
        )}
      >
        Clear all
      </button>

      {exportNode}
    </div>
  )
}
