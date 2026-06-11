"use client"

import { useRef, useEffect } from "react"
import { Check, Minus } from "lucide-react"
import { cn, formatDate } from "@/shared/lib/utils"
import { StatusBadge } from "@/modules/opportunities/components/status-badge"
import { SortableHeader, type SortDir } from "@/shared/components/ui/sortable-header"

// ─── Row type ─────────────────────────────────────────────────────────────────

export interface OppTableRow {
  id: string
  internalId: string | null
  title: string
  customer: string
  reference: string | null
  product: string | null
  status: string
  // Date fields (all optional — presence depends on which API query fetched the row)
  rfqDate?: string | null
  quoteSentDate?: string | null
  elRequestedDate?: string | null
  elDraftSharedDate?: string | null
  elSignedSharedDate?: string | null
  elCountersignedDate?: string | null
  advancePaymentDate?: string | null
  fatPassedDate?: string | null
  satApplicable?: boolean
  satPassedDate?: string | null
  deliveredDate?: string | null
  updatedAt?: string | null
  lastChange?: string | null
}

export interface DateColumn {
  label: string
  sortKey: string
  getValue: (row: OppTableRow) => string | null | undefined
}

// ─── Phase cell ───────────────────────────────────────────────────────────────

function PhaseCell({ done, na = false }: { readonly done: boolean; readonly na?: boolean }) {
  if (na) return <Minus size={13} className="text-gray-300" />
  if (done) return <Check size={13} className="text-green-500" />
  return <span className="w-3 h-3 rounded-full border-2 border-gray-300 inline-block" />
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OpportunityDataTable({
  rows,
  emptyMessage = "No items found.",
  loading = false,
  // Sort
  sortKey,
  sortDir,
  onSort,
  // Optional columns
  dateColumn,
  showPhases = false,
  // Row behaviour
  onRowClick,
  // Multi-select (admin delete)
  selectable = false,
  selected,
  onToggleRow,
  onToggleAll,
  allSelected = false,
  someSelected = false,
  // Per-row action cell (comment button etc.)
  renderAction,
  // Outer wrapper style: "page" adds bg/border/rounded, "modal" is bare
  variant = "page",
}: {
  readonly rows: OppTableRow[]
  readonly emptyMessage?: string
  readonly loading?: boolean
  readonly sortKey: string
  readonly sortDir: SortDir
  readonly onSort: (key: string, dir: SortDir) => void
  readonly dateColumn?: DateColumn
  readonly showPhases?: boolean
  readonly onRowClick?: (id: string) => void
  readonly selectable?: boolean
  readonly selected?: Set<string>
  readonly onToggleRow?: (id: string) => void
  readonly onToggleAll?: () => void
  readonly allSelected?: boolean
  readonly someSelected?: boolean
  readonly renderAction?: (row: OppTableRow) => React.ReactNode
  readonly variant?: "page" | "modal"
}) {
  const checkboxRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = someSelected && !allSelected
  }, [someSelected, allSelected])

  const colCount =
    (selectable ? 1 : 0) + 3 /* title, customer, product */ +
    (dateColumn ? 1 : 0) + (showPhases ? 3 : 0) + 1 /* status */ +
    (renderAction ? 1 : 0)

  const productClass = cn("hidden", showPhases ? "lg:table-cell" : "md:table-cell")

  return (
    <div className={cn(
      "overflow-x-auto",
      variant === "page" && "bg-white border border-gray-200 rounded-xl overflow-hidden"
    )}>
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            {selectable && (
              <th className="w-10 px-4 py-3">
                <input
                  type="checkbox"
                  ref={checkboxRef}
                  checked={allSelected}
                  onChange={onToggleAll}
                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
              </th>
            )}
            <SortableHeader label="Title" sortKey="title" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
            <SortableHeader label="Customer" sortKey="customer" currentSort={sortKey} currentDir={sortDir} onSort={onSort} className="hidden sm:table-cell" />
            <SortableHeader label="Product" sortKey="product" currentSort={sortKey} currentDir={sortDir} onSort={onSort} className={productClass} />
            {dateColumn && (
              <SortableHeader label={dateColumn.label} sortKey={dateColumn.sortKey} currentSort={sortKey} currentDir={sortDir} onSort={onSort} className="hidden lg:table-cell" />
            )}
            {showPhases && (
              <>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Adv. Pay</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">FAT</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">SAT</th>
              </>
            )}
            <SortableHeader label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
            {renderAction && <th className="w-10 px-2 py-3" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {loading && (
            <tr>
              <td colSpan={colCount} className="px-4 py-10 text-center text-gray-400 text-sm">Loading…</td>
            </tr>
          )}
          {!loading && rows.length === 0 && (
            <tr>
              <td colSpan={colCount} className="px-4 py-10 text-center text-gray-400">{emptyMessage}</td>
            </tr>
          )}
          {!loading && rows.map((row) => {
            const isSelected = selectable && !!selected?.has(row.id)
            const dateVal = dateColumn ? dateColumn.getValue(row) : null
            return (
              <tr
                key={row.id}
                onClick={() => selectable ? onToggleRow?.(row.id) : onRowClick?.(row.id)}
                className={cn(
                  "transition-colors",
                  (onRowClick || selectable) && "cursor-pointer",
                  isSelected ? "bg-red-50 hover:bg-red-100" : "hover:bg-gray-50"
                )}
              >
                {selectable && (
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleRow?.(row.id)}
                      className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </td>
                )}
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{row.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {row.internalId && <span className="text-xs text-gray-400">{row.internalId}</span>}
                    {row.reference && <span className="text-xs text-gray-400">{row.reference}</span>}
                  </div>
                  {row.lastChange && (
                    <div className="text-xs text-gray-400 italic mt-0.5 truncate max-w-xs">{row.lastChange}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{row.customer}</td>
                <td className={cn("px-4 py-3 text-gray-500 max-w-xs truncate hidden", showPhases ? "lg:table-cell" : "md:table-cell")}>
                  {row.product ?? "—"}
                </td>
                {dateColumn && (
                  <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                    {dateVal ? formatDate(dateVal) : "—"}
                  </td>
                )}
                {showPhases && (
                  <>
                    <td className="px-3 py-3 text-center hidden md:table-cell">
                      <PhaseCell done={!!row.advancePaymentDate} />
                    </td>
                    <td className="px-3 py-3 text-center hidden md:table-cell">
                      <PhaseCell done={!!row.fatPassedDate} />
                    </td>
                    <td className="px-3 py-3 text-center hidden md:table-cell">
                      <PhaseCell done={!!row.satPassedDate} na={row.satApplicable === false} />
                    </td>
                  </>
                )}
                <td className="px-4 py-3">
                  <StatusBadge status={row.status} short />
                </td>
                {renderAction && (
                  <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                    {renderAction(row)}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
