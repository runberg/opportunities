"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useRef, useEffect } from "react"
import { Search, ChevronDown, Check, X } from "lucide-react"
import { cn, STATUS_GROUPS, STATUS_LABELS, PENDING_LABELS } from "@/lib/utils"

const PENDING_OPTIONS = ["INTERNAL", "CUSTOMER"] as const

export function FilterBar() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [statusOpen, setStatusOpen] = useState(false)
  const [pendingOpen, setPendingOpen] = useState(false)
  const statusRef = useRef<HTMLDivElement>(null)
  const pendingRef = useRef<HTMLDivElement>(null)

  const query = searchParams.get("q") ?? ""
  const statusParam = searchParams.get("status") ?? ""
  const waitingOnParam = searchParams.get("waitingOn") ?? ""

  const selectedStatuses = statusParam ? statusParam.split(",").filter(Boolean) : []
  const selectedPending = waitingOnParam ? waitingOnParam.split(",").filter(Boolean) : []

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      if (statusRef.current && !statusRef.current.contains(target)) setStatusOpen(false)
      if (pendingRef.current && !pendingRef.current.contains(target)) setPendingOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (!value) params.delete(key)
      else params.set(key, value)
    }
    const qs = params.toString()
    router.push(`/opportunities${qs ? `?${qs}` : ""}`)
  }

  function toggleStatus(s: string) {
    const next = selectedStatuses.includes(s)
      ? selectedStatuses.filter((x) => x !== s)
      : [...selectedStatuses, s]
    updateParams({ status: next.length > 0 ? next.join(",") : null })
  }

  function togglePending(p: string) {
    const next = selectedPending.includes(p)
      ? selectedPending.filter((x) => x !== p)
      : [...selectedPending, p]
    updateParams({ waitingOn: next.length > 0 ? next.join(",") : null })
  }

  const statusLabel =
    selectedStatuses.length === 0
      ? "All Statuses"
      : selectedStatuses.length === 1
      ? (STATUS_LABELS[selectedStatuses[0]] ?? selectedStatuses[0])
      : `${selectedStatuses.length} statuses`

  const pendingLabel =
    selectedPending.length === 0
      ? "All — Pending"
      : selectedPending.length === 1
      ? (PENDING_LABELS[selectedPending[0]] ?? selectedPending[0])
      : `${selectedPending.length} pending`

  const hasFilters = query || statusParam || waitingOnParam

  return (
    <div className="flex flex-wrap gap-3 mb-6">
      {/* Search */}
      <form
        className="flex-1 min-w-48 relative"
        onSubmit={(e) => {
          e.preventDefault()
          const fd = new FormData(e.currentTarget)
          updateParams({ q: (fd.get("q") as string) || null })
        }}
      >
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
        />
        <input
          name="q"
          defaultValue={query}
          key={query}
          placeholder="Search by title, customer, ID, reference…"
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
        />
      </form>

      {/* Status multi-select */}
      <div ref={statusRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setStatusOpen((o) => !o)
            setPendingOpen(false)
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none",
            selectedStatuses.length > 0
              ? "border-gray-900 bg-gray-900 text-white"
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
            {STATUS_GROUPS.map((group) => (
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

      {/* Pending multi-select */}
      <div ref={pendingRef} className="relative">
        <button
          type="button"
          onClick={() => {
            setPendingOpen((o) => !o)
            setStatusOpen(false)
          }}
          className={cn(
            "flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors focus:outline-none",
            selectedPending.length > 0
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
          )}
        >
          {pendingLabel}
          <ChevronDown
            size={14}
            className={cn("transition-transform flex-shrink-0", pendingOpen && "rotate-180")}
          />
        </button>

        {pendingOpen && (
          <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1.5">
            {selectedPending.length > 0 && (
              <button
                type="button"
                onClick={() => updateParams({ waitingOn: null })}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 flex items-center gap-2"
              >
                <X size={12} />
                Clear selection
              </button>
            )}
            {PENDING_OPTIONS.map((p) => {
              const checked = selectedPending.includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => togglePending(p)}
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
                  {PENDING_LABELS[p]}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {hasFilters && (
        <button
          type="button"
          onClick={() => router.push("/opportunities")}
          className="px-4 py-2 text-gray-500 text-sm rounded-lg hover:bg-gray-100 transition-colors"
        >
          Clear all
        </button>
      )}
    </div>
  )
}
