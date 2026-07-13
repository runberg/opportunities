"use client"

import { useState } from "react"
import type { AgreementRow } from "./adhoc-client"
import { DeliverableModal } from "./deliverable-modal"
import { Button } from "@/shared/components/ui/button"
import { formatAmount } from "@/shared/lib/utils"

const STATUS_BADGE: Record<string, string> = {
  NOT_APPROVED: "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300",
  PARTIALLY_APPROVED: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  APPROVED: "bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300",
  DELIVERED: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
}

const STATUS_LABEL: Record<string, string> = {
  NOT_APPROVED: "Not Approved",
  PARTIALLY_APPROVED: "Partial",
  APPROVED: "Approved",
  DELIVERED: "Delivered",
}

type Props = {
  readonly agreement: AgreementRow
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onRefresh: () => Promise<void>
}

export function DeliverablesTable({ agreement, currentUserId, isAdmin, onRefresh }: Props) {
  const [openDeliverableId, setOpenDeliverableId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [newTitle, setNewTitle] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canAdd = agreement.status === "SIGNED" || agreement.status === "ACTIVE"

  async function handleAdd() {
    if (!newTitle.trim()) return
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/adhoc/agreements/${agreement.id}/deliverables`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "Failed to create work package")
        return
      }
      setNewTitle("")
      setAdding(false)
      await onRefresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
          Work Packages ({agreement.deliverables.length})
        </h3>
        {canAdd && !adding && (
          <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
            + Add Work Package
          </Button>
        )}
      </div>

      {adding && (
        <div className="flex gap-2 mb-3">
          <input
            autoFocus
            className="flex-1 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-1.5 text-sm text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Work package title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd()
              if (e.key === "Escape") { setAdding(false); setNewTitle("") }
            }}
          />
          <Button variant="primary" size="sm" onClick={handleAdd} disabled={saving || !newTitle.trim()}>
            {saving ? "Saving…" : "Add"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => { setAdding(false); setNewTitle("") }}>
            Cancel
          </Button>
        </div>
      )}
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      {agreement.deliverables.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">
          {canAdd ? "No work packages yet. Add one above." : "No work packages."}
        </p>
      ) : (
        <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/50">
              <tr>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Title
                </th>
                <th className="px-4 py-2.5 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Status
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Approved
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Line Items
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Balance
                </th>
                <th className="px-4 py-2.5 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Docs
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {agreement.deliverables.map((d) => {
                const lineTotal = d.lineItems.reduce((s, li) => s + Number(li.amount), 0)
                const approved = Number(d.approvedAmount)
                const balance = approved - lineTotal
                const over = lineTotal > approved && approved > 0
                return (
                  <tr
                    key={d.id}
                    className="bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer"
                    onClick={() => setOpenDeliverableId(d.id)}
                  >
                    <td className="px-4 py-3 text-gray-900 dark:text-gray-100 font-medium">
                      {d.title}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_BADGE[d.status]}`}>
                        {STATUS_LABEL[d.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                      {approved > 0 ? formatAmount(approved) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300 tabular-nums">
                      {lineTotal > 0 ? formatAmount(lineTotal) : "—"}
                    </td>
                    <td className={`px-4 py-3 text-right tabular-nums font-medium ${over ? "text-red-600" : "text-gray-700 dark:text-gray-300"}`}>
                      {approved > 0 ? formatAmount(balance) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 dark:text-gray-400">
                      {d.documents.length}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {openDeliverableId && (
        <DeliverableModal
          deliverableId={openDeliverableId}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onClose={() => setOpenDeliverableId(null)}
          onRefresh={onRefresh}
        />
      )}
    </div>
  )
}
