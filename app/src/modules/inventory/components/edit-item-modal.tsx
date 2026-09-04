"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Label } from "@/shared/components/ui/label"
import { Input } from "@/shared/components/ui/input"
import type { ItemRow } from "./inventory-client"

type Props = {
  readonly item: ItemRow | null
  readonly onClose: () => void
  readonly onSaved: () => Promise<void>
}

export function EditItemModal({ item, onClose, onSaved }: Props) {
  const [productName, setProductName] = useState("")
  const [originalQuantity, setOriginalQuantity] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const utilized = item ? item.originalQuantity - item.remainingQuantity : 0

  // Resync form fields whenever the target item changes — this modal is a single
  // persistent instance, so useState initializers alone only run once.
  useEffect(() => {
    setProductName(item?.productName ?? "")
    setOriginalQuantity(item ? String(item.originalQuantity) : "")
    setError("")
  }, [item?.id])

  const qtyNum = Number(originalQuantity)
  const qtyValid = Number.isInteger(qtyNum) && qtyNum > 0 && qtyNum >= utilized

  function handleClose() {
    onClose()
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!item || !productName.trim() || !qtyValid) return
    setSaving(true)
    setError("")

    const res = await fetch(`/api/inventory/items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName: productName.trim(), originalQuantity: qtyNum }),
    })

    setSaving(false)
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Failed to update item.")
      return
    }

    await onSaved()
    handleClose()
  }

  return (
    <Dialog open={!!item} onClose={handleClose} title="Edit Item">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="edit-item-name">Product name *</Label>
          <Input
            id="edit-item-name"
            autoFocus
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            required
          />
        </div>
        <div>
          <Label htmlFor="edit-item-qty">
            Original quantity * {utilized > 0 && <span className="font-normal text-gray-500">(min {utilized} already utilized)</span>}
          </Label>
          <input
            id="edit-item-qty"
            type="number"
            min={utilized || 1}
            step={1}
            value={originalQuantity}
            onChange={(e) => setOriginalQuantity(e.target.value)}
            className="w-full px-3 py-2 border border-gray-600 rounded-lg text-sm bg-gray-800 text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500"
            required
          />
          {originalQuantity !== "" && !qtyValid && (
            <p className="text-xs text-red-400 mt-1">
              Enter a whole number of at least {Math.max(utilized, 1)}.
            </p>
          )}
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={saving || !productName.trim() || !qtyValid}>
            {saving ? "Saving…" : "Save Changes"}
          </Button>
          <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
        </div>
      </form>
    </Dialog>
  )
}
