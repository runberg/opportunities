"use client"

import { useState } from "react"
import { ChevronRight, ChevronDown, Trash2, Pencil, Briefcase } from "lucide-react"
import { cn, formatDate } from "@/shared/lib/utils"
import { Button } from "@/shared/components/ui/button"
import { FileTypeIcon } from "@/shared/components/ui/file-type-icon"
import { FileViewerModals } from "@/shared/components/ui/file-viewer-modals"
import { useFileViewer } from "@/shared/lib/use-file-viewer"
import type { ItemRow as ItemRowType, UtilizationRow, AllocationStatus } from "./inventory-client"

function AllocationTag({ status }: { readonly status: AllocationStatus }) {
  const allocated = status === "ALLOCATED"
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium shrink-0",
        allocated ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"
      )}
    >
      {allocated ? "Allocated" : "Reserved"}
    </span>
  )
}

type Props = {
  readonly item: ItemRowType
  readonly isReadOnly: boolean
  readonly isAdmin: boolean
  readonly onUtilize: (item: ItemRowType) => void
  readonly onEditUtilization: (item: ItemRowType, utilization: UtilizationRow) => void
  readonly onDeleteUtilization: (utilizationId: string) => Promise<void>
  readonly onDeleteItem: (itemId: string) => Promise<void>
  readonly onEditItem: (item: ItemRowType) => void
  readonly onOpenOpportunity: (opportunityId: string) => void
}

export function ItemRow({
  item, isReadOnly, isAdmin, onUtilize, onEditUtilization, onDeleteUtilization, onDeleteItem, onEditItem, onOpenOpportunity,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const utilizedCount = item.utilizations.length
  const canDeleteItem = item.remainingQuantity === item.originalQuantity
  const fullyUtilized = item.remainingQuantity <= 0
  const viewers = useFileViewer()

  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3 py-2.5 px-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-gray-400 hover:text-gray-600 shrink-0"
          aria-label={expanded ? "Collapse" : "Expand"}
        >
          {expanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
        <span className="flex-1 min-w-0 truncate text-sm font-medium text-gray-900">{item.productName}</span>
        <span className="text-sm font-semibold text-gray-900 tabular-nums shrink-0 whitespace-nowrap">
          {item.remainingQuantity} / {item.originalQuantity} remaining
        </span>
        <span className="text-[11px] text-gray-400 shrink-0">{utilizedCount} utilization{utilizedCount === 1 ? "" : "s"}</span>
        {!isReadOnly && (
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant={fullyUtilized ? "secondary" : "primary"}
              size="sm"
              onClick={() => onUtilize(item)}
              disabled={fullyUtilized}
            >
              Utilize
            </Button>
            <button
              type="button"
              onClick={() => onEditItem(item)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Edit item"
            >
              <Pencil size={14} />
            </button>
            {isAdmin && (
              <button
                type="button"
                onClick={() => canDeleteItem && onDeleteItem(item.id)}
                disabled={!canDeleteItem}
                className={cn(
                  "p-1.5 rounded-md text-gray-400 transition-colors",
                  canDeleteItem ? "hover:text-red-600 hover:bg-red-50" : "opacity-30 cursor-not-allowed"
                )}
                title={canDeleteItem ? "Delete item" : "Can't delete — this item already has utilizations"}
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>

      {expanded && (
        <div className="pl-8 pb-3 pr-1">
          {utilizedCount === 0 ? (
            <p className="text-xs text-gray-400 py-1">No utilizations yet.</p>
          ) : (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs table-fixed">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left font-semibold text-gray-500 px-3 py-2 w-24">Date</th>
                    <th className="text-right font-semibold text-gray-500 px-3 py-2 w-16">Qty</th>
                    <th className="text-left font-semibold text-gray-500 px-3 py-2">Opportunity</th>
                    <th className="text-left font-semibold text-gray-500 px-3 py-2 w-20">Status</th>
                    <th className="text-left font-semibold text-gray-500 px-3 py-2">Delivery Note</th>
                    <th className="text-left font-semibold text-gray-500 px-3 py-2">Comment</th>
                    {!isReadOnly && <th className="w-16 px-3 py-2" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {item.utilizations.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 h-9">
                      <td className="px-3 py-2 text-gray-700 whitespace-nowrap align-middle">{formatDate(u.date)}</td>
                      <td className="px-3 py-2 text-right text-gray-700 tabular-nums align-middle">{u.quantity}</td>
                      <td className="px-3 py-2 align-middle">
                        {u.opportunity ? (
                          <button
                            type="button"
                            onClick={() => onOpenOpportunity(u.opportunity!.id)}
                            className="inline-flex items-center gap-1 text-gray-900 hover:underline truncate max-w-[9rem]"
                            title={`${u.opportunity.title} — ${u.opportunity.customer}`}
                          >
                            <Briefcase size={12} className="shrink-0 text-gray-400" />
                            <span className="truncate">{u.opportunity.title}</span>
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 align-middle">
                        <AllocationTag status={u.allocationStatus} />
                      </td>
                      <td className="px-3 py-2 align-middle">
                        {u.filename && u.originalName && u.mimeType ? (
                          <button
                            type="button"
                            onClick={() => viewers.openViewer({ id: u.id, displayName: u.displayName ?? u.originalName!, mimeType: u.mimeType! })}
                            className="inline-flex items-center gap-1 text-gray-900 hover:underline truncate max-w-[10rem] align-middle"
                            title={u.displayName ?? u.originalName}
                          >
                            <span className="inline-flex items-center justify-center w-[13px] h-4 shrink-0 [&_svg]:w-[13px] [&_svg]:h-4">
                              <FileTypeIcon mimeType={u.mimeType} />
                            </span>
                            <span className="truncate">{u.displayName ?? u.originalName}</span>
                          </button>
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-gray-500 truncate align-middle" title={u.comment ?? undefined}>
                        {u.comment ?? "—"}
                      </td>
                      {!isReadOnly && (
                        <td className="px-3 py-2 align-middle">
                          <div className="flex items-center gap-1 justify-end">
                            <button
                              type="button"
                              onClick={() => onEditUtilization(item, u)}
                              className="p-1 text-gray-400 hover:text-gray-700 rounded transition-colors"
                              title="Edit"
                            >
                              <Pencil size={12} />
                            </button>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={() => onDeleteUtilization(u.id)}
                                className="p-1 text-gray-400 hover:text-red-600 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <FileViewerModals viewers={viewers} urlFor={(id) => `/api/inventory/utilizations/${id}/file`} />
    </div>
  )
}
