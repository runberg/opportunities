"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { DatePicker } from "@/shared/components/ui/date-picker"
import { FileDropZone } from "@/shared/components/ui/file-drop-zone"
import { useDropZone } from "@/shared/lib/use-drop-zone"
import { todayISO } from "@/shared/lib/utils"
import { OpportunityPicker } from "./opportunity-picker"
import type { ItemRow, UtilizationRow } from "./inventory-client"

type Props = {
  readonly item: ItemRow | null
  readonly utilization: UtilizationRow | null
  readonly onClose: () => void
  readonly onSaved: () => Promise<void>
}

export function UtilizeItemModal({ item, utilization, onClose, onSaved }: Props) {
  const editing = !!utilization
  const [quantity, setQuantity] = useState("")
  const [date, setDate] = useState(todayISO())
  const [comment, setComment] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [opportunityId, setOpportunityId] = useState<string | null>(null)
  const [opportunityLabel, setOpportunityLabel] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Resync form fields whenever the target item/utilization changes — this modal is a
  // single persistent instance (not remounted per target), so useState initializers alone
  // only run once and won't repopulate on a second open.
  useEffect(() => {
    setQuantity(utilization ? String(utilization.quantity) : "")
    setDate(utilization ? utilization.date.slice(0, 10) : todayISO())
    setComment(utilization?.comment ?? "")
    setDisplayName(utilization?.displayName ?? "")
    setFile(null)
    setOpportunityId(utilization?.opportunity?.id ?? null)
    setOpportunityLabel(utilization?.opportunity ? `${utilization.opportunity.title} — ${utilization.opportunity.customer}` : null)
    setError("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, utilization?.id])

  const { dragging, onDragOver, onDragLeave, onDrop } = useDropZone(setFile)

  const maxQuantity = item ? item.remainingQuantity + (utilization?.quantity ?? 0) : 0
  const qtyNum = Number(quantity)
  const qtyValid = Number.isInteger(qtyNum) && qtyNum > 0 && qtyNum <= maxQuantity

  function handleClose() {
    onClose()
  }

  function submitLabel(): string {
    if (saving) return "Saving…"
    return editing ? "Save Changes" : "Record Utilization"
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!item || !qtyValid || !date) return
    setSaving(true)
    setError("")

    const fd = new FormData()
    fd.append("quantity", String(qtyNum))
    fd.append("date", date)
    fd.append("comment", comment.trim())
    fd.append("displayName", displayName.trim())
    fd.append("opportunityId", opportunityId ?? "")
    if (file) fd.append("file", file)

    const url = editing ? `/api/inventory/utilizations/${utilization!.id}` : `/api/inventory/items/${item.id}/utilizations`
    const method = editing ? "PATCH" : "POST"
    const res = await fetch(url, { method, body: fd })

    setSaving(false)
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Failed to save utilization.")
      return
    }

    handleClose()
    await onSaved()
  }

  return (
    <Dialog
      open={!!item}
      onClose={handleClose}
      title={editing ? `Edit Utilization — ${item?.productName ?? ""}` : `Utilize — ${item?.productName ?? ""}`}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="util-quantity">
            Quantity * <span className="font-normal text-gray-500">(max {maxQuantity})</span>
          </Label>
          <input
            id="util-quantity"
            type="number"
            min={1}
            max={maxQuantity}
            step={1}
            autoFocus
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-lg text-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
          {quantity !== "" && !qtyValid && (
            <p className="text-xs text-red-400 mt-1">Enter a whole number between 1 and {maxQuantity}.</p>
          )}
        </div>
        <div>
          <Label htmlFor="util-date">Date *</Label>
          <DatePicker value={date} onChange={setDate} clearable={false} />
        </div>
        <div>
          <Label htmlFor="util-file">
            Delivery Note <span className="font-normal text-gray-500">(optional{editing && utilization?.originalName ? ` — replaces "${utilization.originalName}"` : ""})</span>
          </Label>
          <FileDropZone
            file={file}
            dragging={dragging}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onFile={setFile}
            accept=".pdf,.xlsx,.xls,.docx"
            compact
          />
          <p className="text-xs text-gray-500 mt-1">Word (.docx), PDF, or Excel</p>
        </div>
        <div>
          <Label htmlFor="util-display-name">Delivery Note Name <span className="font-normal text-gray-500">(optional)</span></Label>
          <input
            id="util-display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="BT-XXXXXXXXXX"
            className="w-full px-3 py-2 border border-gray-600 rounded-lg text-sm bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <Label htmlFor="util-opportunity">Opportunity <span className="font-normal text-gray-500">(optional)</span></Label>
          <OpportunityPicker
            value={opportunityId}
            label={opportunityLabel}
            onChange={(o) => { setOpportunityId(o?.id ?? null); setOpportunityLabel(o ? `${o.title} — ${o.customer}` : null) }}
          />
        </div>
        <div>
          <Label htmlFor="util-comment">Comment <span className="font-normal text-gray-500">(optional)</span></Label>
          <Textarea
            id="util-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
          />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={saving || !qtyValid || !date}>
            {submitLabel()}
          </Button>
          <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
        </div>
      </form>
    </Dialog>
  )
}
