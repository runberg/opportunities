"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useState, useEffect } from "react"
import { Download } from "lucide-react"
import { STATUS_GROUPS, STATUS_LABELS } from "@/shared/lib/utils"
import { TableFilterBar, type FilterStatusGroup } from "@/shared/components/ui/table-filter-bar"

// ─── Types ────────────────────────────────────────────────────────────────────

type RawStatusGroup = { label: string; statuses: string[] }

// ─── Component ───────────────────────────────────────────────────────────────

export function FilterBar({
  basePath = "/opportunities",
  statusGroups = STATUS_GROUPS as RawStatusGroup[],
  exportType,
}: {
  readonly basePath?: string
  readonly statusGroups?: RawStatusGroup[]
  readonly exportType?: "quotes" | "els" | "production"
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const query = searchParams.get("q") ?? ""
  const statusParam = searchParams.get("status") ?? ""
  const selectedStatuses = statusParam ? statusParam.split(",").filter(Boolean) : []

  const [inputValue, setInputValue] = useState(query)

  useEffect(() => { setInputValue(query) }, [query])

  // Debounce: fire when empty or ≥3 chars
  useEffect(() => {
    if (inputValue.length > 0 && inputValue.length < 3) return
    const timer = setTimeout(() => { updateParams({ q: inputValue || null }) }, 350)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputValue])

  function updateParams(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [key, value] of Object.entries(updates)) {
      if (value === null) params.delete(key)
      else params.set(key, value)
    }
    if (!("page" in updates)) params.delete("page")
    const qs = params.toString()
    router.push(qs ? `${basePath}?${qs}` : basePath)
  }

  // Transform raw status groups (string[]) into the shape TableFilterBar expects
  const groups: FilterStatusGroup[] = statusGroups.map((g) => ({
    label: g.label,
    statuses: g.statuses.map((s) => ({ value: s, label: STATUS_LABELS[s] ?? s })),
  }))

  const exportUrl = exportType
    ? `/api/export?type=${exportType}` +
      (query ? `&q=${encodeURIComponent(query)}` : "") +
      (statusParam ? `&status=${encodeURIComponent(statusParam)}` : "")
    : null

  const exportNode = exportUrl ? (
    <a
      href={exportUrl}
      download
      className="flex items-center gap-1.5 px-3 py-2 border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 rounded-lg text-sm transition-colors ml-auto"
    >
      <Download size={14} />
      Export CSV
    </a>
  ) : undefined

  return (
    <TableFilterBar
      search={inputValue}
      onSearchChange={setInputValue}
      placeholder="Search by title, customer, ID, reference…"
      selectedStatuses={selectedStatuses}
      onToggleStatus={(s) => {
        const next = selectedStatuses.includes(s)
          ? selectedStatuses.filter((x) => x !== s)
          : [...selectedStatuses, s]
        updateParams({ status: next.length > 0 ? next.join(",") : null })
      }}
      onClearStatuses={() => updateParams({ status: null })}
      onClearAll={() => router.push(basePath)}
      statusGroups={groups}
      exportNode={exportNode}
    />
  )
}
