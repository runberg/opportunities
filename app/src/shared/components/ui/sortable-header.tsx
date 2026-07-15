import { ChevronUp, ChevronDown, ChevronsUpDown } from "lucide-react"
import { cn } from "@/shared/lib/utils"

export type SortDir = "asc" | "desc"

export function SortableHeader({
  label, sortKey, currentSort, currentDir, onSort, className, align = "left",
}: {
  readonly label: string
  readonly sortKey: string
  readonly currentSort: string
  readonly currentDir: SortDir
  readonly onSort: (key: string, dir: SortDir) => void
  readonly className?: string
  readonly align?: "left" | "center"
}) {
  const active = currentSort === sortKey
  const nextDir = active && currentDir === "asc" ? "desc" : "asc"
  const dirIcon = currentDir === "asc"
    ? <ChevronUp size={11} className="flex-shrink-0" />
    : <ChevronDown size={11} className="flex-shrink-0" />
  const sortIcon = active ? dirIcon : <ChevronsUpDown size={11} className="opacity-25 flex-shrink-0" />
  return (
    <th
      onClick={() => onSort(sortKey, nextDir)}
      className={cn(
        "px-4 py-3 text-xs font-semibold text-gray-500 cursor-pointer select-none hover:text-gray-700 transition-colors",
        align === "left" ? "text-left" : "text-center",
        className
      )}
    >
      <span className={cn("inline-flex items-center gap-1", align === "center" && "justify-center w-full")}>
        {label}
        {sortIcon}
      </span>
    </th>
  )
}

function compareValues(av: unknown, bv: unknown, dir: SortDir): number {
  const order = dir === "asc" ? 1 : -1
  if (av == null && bv == null) return 0
  if (av == null) return order
  if (bv == null) return -order
  if (typeof av === "string" && typeof bv === "string") {
    return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av)
  }
  if (dir === "asc") return av > bv ? 1 : -1
  return av < bv ? 1 : -1
}

export function sortRows<T>(data: T[], key: string, dir: SortDir, nullTiebreakKey?: string): T[] {
  return [...data].sort((a, b) => {
    const av = (a as Record<string, unknown>)[key]
    const bv = (b as Record<string, unknown>)[key]
    const primary = compareValues(av, bv, dir)
    if (primary !== 0 || !nullTiebreakKey || av != null || bv != null) return primary
    return compareValues(
      (a as Record<string, unknown>)[nullTiebreakKey],
      (b as Record<string, unknown>)[nullTiebreakKey],
      "desc"
    )
  })
}
