"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { formatAmount } from "@/shared/lib/utils"
import type { PreSalesCostItem, PreSalesEstimate } from "../pre-sales/types"

type Editor = { kind: "add" } | { kind: "edit" | "remove"; item: PreSalesCostItem }

export function PreSalesCosts({ opportunityId, estimate, canWrite, onRefresh }: {
  readonly opportunityId: string
  readonly estimate: PreSalesEstimate
  readonly canWrite: boolean
  readonly onRefresh: () => void
}) {
  const [editor, setEditor] = useState<Editor | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const item = editor && editor.kind !== "add" ? editor.item : undefined
  const removing = editor?.kind === "remove"

  function select(next: Editor | null) {
    setEditor(next)
    setError("")
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editor || saving) return
    const cost = Object.fromEntries(new FormData(event.currentTarget))
    const body = {
      action: editor.kind,
      ...(item && { costId: item.id }),
      ...(!removing && { cost }),
    }
    setSaving(true)
    setError("")
    try {
      const response = await fetch(`/api/opportunities/${opportunityId}/pre-sales-costs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      if (!response.ok) {
        const data = await response.json().catch(() => ({}))
        setError(data.error ?? "Could not save the estimate.")
        return
      }
      select(null)
      onRefresh()
    } catch {
      setError("Could not reach the portal. Refresh the estimate before retrying.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="my-4 space-y-3 rounded-xl border border-gray-200 bg-white p-4 text-gray-900">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Pre-sales costs</h2>
          <p className="mt-1 text-sm">Estimated total <strong className="ml-1 tabular-nums">{formatAmount(estimate.total)}</strong></p>
        </div>
        {canWrite && !editor && <Button size="sm" onClick={() => select({ kind: "add" })}>Add cost item</Button>}
      </div>
      {estimate.items.length ? (
        <ul className="divide-y divide-gray-200">
          {estimate.items.map((cost) => (
            <li key={cost.id} className="flex flex-wrap items-start justify-between gap-2 py-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="break-words font-medium">{cost.item}</p>
                {cost.note && <p className="whitespace-pre-wrap break-words text-xs text-gray-600">{cost.note}</p>}
              </div>
              <span className="tabular-nums">{formatAmount(cost.estimatedAmount)}</span>
              {canWrite && !editor && (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => select({ kind: "edit", item: cost })}>Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => select({ kind: "remove", item: cost })}>Remove</Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : <p className="text-xs text-gray-500">No cost items yet.</p>}
      {canWrite && editor && (
        <form key={item?.id ?? "new"} onSubmit={submit} className="space-y-3 rounded-lg border border-gray-200 p-3">
          {removing ? (
            <p className="text-sm">Remove <strong>{item?.item}</strong> from this estimate?</p>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr]">
                <label className="block text-xs font-medium">Item
                  <Input name="item" defaultValue={item?.item} maxLength={160} required />
                </label>
                <label className="block text-xs font-medium">Estimated cost
                  <Input name="estimatedAmount" defaultValue={item?.estimatedAmount} inputMode="decimal"
                    maxLength={13} placeholder="0.00" required />
                </label>
              </div>
              <label className="block text-xs font-medium">Note (optional)
                <textarea name="note" defaultValue={item?.note ?? ""} rows={2} maxLength={500}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
              </label>
            </>
          )}
          {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
          <div className="flex gap-2">
            <Button size="sm" type="submit" variant={removing ? "danger" : "primary"} disabled={saving}>
              {saving ? "Saving…" : removing ? "Remove item" : "Save item"}
            </Button>
            <Button size="sm" variant="ghost" disabled={saving} onClick={() => select(null)}>Cancel</Button>
          </div>
        </form>
      )}
    </section>
  )
}
