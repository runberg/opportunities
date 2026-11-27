"use client"

import { CommentDialog } from "@/shared/components/ui/comment-dialog"
import { Panel } from "@/shared/components/ui/panel"
import { ClientName, type ClientIdentity } from "@/shared/components/clients/client-name"

import { useRef, useEffect, useState } from "react"
import { Check, MessageSquarePlus, Minus, Truck } from "lucide-react"
import { cn, formatDate, statusAgeLabel, calendarAgeLabel, isCalendarDateStatus } from "@/shared/lib/utils"
import { StatusBadge } from "@/modules/opportunities/components/status-badge"
import { SortableHeader, type SortDir } from "@/shared/components/ui/sortable-header"

// ─── Row type ─────────────────────────────────────────────────────────────────

export interface OppTableRow {
  id: string
  internalId: string | null
  createdAt?: string | null
  title: string
  customer: string
  client?: ClientIdentity | null
  reference: string | null
  product: string | null
  status: string
  _count?: { deliveries?: number }
  // Date fields (all optional — presence depends on which API query fetched the row)
  rfqDate?: string | null
  quoteSentDate?: string | null
  elRequestedDate?: string | null
  elDraftSharedDate?: string | null
  elDraftReturnedDate?: string | null
  elSignedSharedDate?: string | null
  elCountersignedDate?: string | null
  advancePaymentDate?: string | null
  fatPassedDate?: string | null
  satApplicable?: boolean
  satPassedDate?: string | null
  deliveredDate?: string | null
  updatedAt?: string | null
  lastChange?: string | null
  // Raw timestamp the row entered its current status — rendered as a relative label after the badge
  statusSince?: string | null
}

export interface DateColumn {
  label: string
  sortKey: string
  getValue: (row: OppTableRow) => string | null | undefined
}

// ─── Phase cell ───────────────────────────────────────────────────────────────

function PhaseCell({ done, na = false }: { readonly done: boolean; readonly na?: boolean }) {
  if (na) return <Minus size={13} className="inline-block align-middle text-gray-300" />
  if (done) return <Check size={13} className="inline-block align-middle text-green-500" />
  return <span className="w-3 h-3 rounded-full border-2 border-gray-300 inline-block align-middle" />
}

/** "How long ago" label for the moment a row entered its current status — calendar-date
 * based for milestone statuses, hour-precise for real-timestamp ones (see isCalendarDateStatus). */
function statusSinceLabel(row: OppTableRow): string | null {
  if (!row.statusSince) return null
  return isCalendarDateStatus(row.status) ? calendarAgeLabel(row.statusSince) : statusAgeLabel(row.statusSince)
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
  allowComments = false,
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
  readonly allowComments?: boolean
  readonly variant?: "page" | "modal"
}) {
  const [commentTarget, setCommentTarget] = useState<OppTableRow | null>(null)
  const checkboxRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (checkboxRef.current) checkboxRef.current.indeterminate = someSelected && !allSelected
  }, [someSelected, allSelected])

  const hasDeliveryMarkers = rows.some((row) => (row._count?.deliveries ?? 0) > 0)
  const hasActionsColumn = allowComments || hasDeliveryMarkers
  const colCount =
    (selectable ? 1 : 0) + 4 /* id, title, customer, product */ +
    (dateColumn ? 1 : 0) + (showPhases ? 3 : 0) + 2 /* status, status since */ +
    (hasActionsColumn ? 1 : 0)

  const productClass = cn("hidden w-36", showPhases ? "lg:table-cell" : "md:table-cell")

  const Container = variant === "page" ? Panel : "div"

  const table = (
    <Container className="overflow-x-auto">
      <table className="w-full text-sm table-fixed">
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
            <SortableHeader label="ID" sortKey="internalId" currentSort={sortKey} currentDir={sortDir} onSort={onSort} className="hidden sm:table-cell w-28" />
            <SortableHeader label="Title" sortKey="title" currentSort={sortKey} currentDir={sortDir} onSort={onSort} />
            <SortableHeader label="Customer" sortKey="customer" currentSort={sortKey} currentDir={sortDir} onSort={onSort} className="hidden sm:table-cell w-40" />
            <SortableHeader label="Product" sortKey="product" currentSort={sortKey} currentDir={sortDir} onSort={onSort} className={productClass} />
            {dateColumn && (
              <SortableHeader label={dateColumn.label} sortKey={dateColumn.sortKey} currentSort={sortKey} currentDir={sortDir} onSort={onSort} className="hidden lg:table-cell w-32" />
            )}
            {showPhases && (
              <>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell w-20">Adv. Pay</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell w-16">FAT</th>
                <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell w-16">SAT</th>
              </>
            )}
            <SortableHeader label="Status" sortKey="status" currentSort={sortKey} currentDir={sortDir} onSort={onSort} className="w-32" />
            <SortableHeader label="Status Since" sortKey="statusSince" currentSort={sortKey} currentDir={sortDir} onSort={onSort} className="hidden xl:table-cell w-44" />
            {hasActionsColumn && <th className={cn("px-2 py-3", allowComments && hasDeliveryMarkers ? "w-[4.5rem]" : "w-10")}>
              <span className="sr-only">Delivery plans and actions</span>
            </th>}
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
            const sinceLabel = statusSinceLabel(row)
            return (
              <tr
                key={row.id}
                onClick={() => selectable ? onToggleRow?.(row.id) : onRowClick?.(row.id)}
                className={cn(
                  "h-16 transition-colors",
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
                <td className="px-4 py-3 hidden sm:table-cell w-28">
                  {row.internalId
                    ? <span className="text-xs font-mono text-gray-500">{row.internalId}</span>
                    : <span className="text-xs text-gray-300">—</span>
                  }
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900 truncate block">{row.title}</span>
                  {row.reference && (
                    <div className="text-xs text-gray-400 mt-0.5 truncate">{row.reference}</div>
                  )}
                  {row.lastChange && (
                    <div className="text-xs text-gray-400 italic mt-0.5 truncate">{row.lastChange}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell"><ClientName label={row.customer} client={row.client} /></td>
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
                <td className="px-4 py-3 text-center">
                  <StatusBadge status={row.status} short />
                  {sinceLabel && (
                    <div className="text-xs text-gray-400 mt-1 whitespace-nowrap xl:hidden">
                      {sinceLabel}
                    </div>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden xl:table-cell whitespace-nowrap">
                  {sinceLabel ?? "—"}
                </td>
                {hasActionsColumn && (
                  <td className="px-2 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {(row._count?.deliveries ?? 0) > 0 && (
                        <span role="img" aria-label="Has planned deliveries" title="Has planned deliveries" className="inline-flex shrink-0 text-blue-500">
                          <Truck size={15} aria-hidden="true" />
                        </span>
                      )}
                      {allowComments && (
                        <button type="button" aria-label="Add comment" title="Add comment"
                          className="rounded-md p-1.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700"
                          onClick={(event) => {
                            event.stopPropagation()
                            setCommentTarget(row)
                          }}>
                          <MessageSquarePlus size={16} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </Container>
  )

  return (
    <>
      {table}
      <CommentDialog
        target={allowComments ? commentTarget : null}
        commentEndpoint={commentTarget ? `/api/opportunities/${commentTarget.id}/comments` : ""}
        onClose={() => setCommentTarget(null)}
      />
    </>
  )
}
