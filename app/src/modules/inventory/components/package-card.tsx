"use client"

import { useState } from "react"
import { ChevronDown, ChevronUp, Pencil, Trash2, Plus, Briefcase } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { ItemRow } from "./item-row"
import type { PackageRow, ItemRow as ItemRowType, UtilizationRow } from "./inventory-client"

type Props = {
  readonly pkg: PackageRow
  readonly isReadOnly: boolean
  readonly isAdmin: boolean
  readonly onRefresh: () => Promise<void>
  readonly onEditPackage: (pkg: PackageRow) => void
  readonly onUtilize: (item: ItemRowType) => void
  readonly onEditUtilization: (item: ItemRowType, utilization: UtilizationRow) => void
  readonly onOpenOpportunity: (opportunityId: string) => void
}

export function PackageCard({ pkg, isReadOnly, isAdmin, onRefresh, onEditPackage, onUtilize, onEditUtilization, onOpenOpportunity }: Props) {
  const [showMore, setShowMore] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newProduct, setNewProduct] = useState("")
  const [newQty, setNewQty] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function addItem() {
    const qty = Number(newQty)
    if (!newProduct.trim() || !Number.isInteger(qty) || qty <= 0) return
    setSaving(true)
    setError("")
    const res = await fetch(`/api/inventory/packages/${pkg.id}/items`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productName: newProduct.trim(), originalQuantity: qty }),
    })
    setSaving(false)
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Failed to add item.")
      return
    }
    setNewProduct("")
    setNewQty("")
    setAdding(false)
    await onRefresh()
  }

  async function deleteUtilization(utilizationId: string) {
    if (!confirm("Delete this utilization? This restores the quantity to the item.")) return
    await fetch(`/api/inventory/utilizations/${utilizationId}`, { method: "DELETE" })
    await onRefresh()
  }

  async function deleteItem(itemId: string) {
    if (!confirm("Delete this item?")) return
    await fetch(`/api/inventory/items/${itemId}`, { method: "DELETE" })
    await onRefresh()
  }

  async function deletePackage() {
    if (!confirm(`Delete package "${pkg.name}" and all its items?`)) return
    await fetch(`/api/inventory/packages/${pkg.id}`, { method: "DELETE" })
    await onRefresh()
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-gray-900 truncate">{pkg.name}</h2>
          <p className="text-xs text-gray-500 mt-0.5">{pkg.createdBy.name} · {pkg.items.length} item{pkg.items.length === 1 ? "" : "s"}</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setShowMore((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
          >
            {showMore ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {showMore ? "Show less" : "Show more"}
          </button>
          {!isReadOnly && (
            <button
              type="button"
              onClick={() => onEditPackage(pkg)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              title="Edit package"
            >
              <Pencil size={14} />
            </button>
          )}
          {isAdmin && (
            <button
              type="button"
              onClick={deletePackage}
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete package"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {showMore && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
          <div>
            <p className="text-xs text-gray-400 mb-1">Linked Opportunity</p>
            {pkg.opportunity ? (
              <button
                type="button"
                onClick={() => onOpenOpportunity(pkg.opportunity!.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[#006fff] hover:bg-[#005ee6] transition-colors"
              >
                <Briefcase size={14} />
                {pkg.opportunity.title} — {pkg.opportunity.customer}
              </button>
            ) : (
              <p className="text-sm text-gray-400">None</p>
            )}
          </div>
          <div>
            <p className="text-xs text-gray-400">Comments</p>
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{pkg.comment || "—"}</p>
          </div>
        </div>
      )}

      <div className="mt-4">
        {pkg.items.length === 0 && !adding && (
          <p className="text-sm text-gray-400 py-2">No items yet.</p>
        )}
        {pkg.items.map((item) => (
          <ItemRow
            key={item.id}
            item={item}
            isReadOnly={isReadOnly}
            isAdmin={isAdmin}
            onUtilize={onUtilize}
            onEditUtilization={onEditUtilization}
            onDeleteUtilization={deleteUtilization}
            onDeleteItem={deleteItem}
            onOpenOpportunity={onOpenOpportunity}
          />
        ))}
      </div>

      {!isReadOnly && (
        adding ? (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor={`new-product-${pkg.id}`} className="block text-xs text-gray-500 mb-1">Product name</label>
              <input
                id={`new-product-${pkg.id}`}
                autoFocus
                value={newProduct}
                onChange={(e) => setNewProduct(e.target.value)}
                className="w-56 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-gray-400"
                placeholder="e.g. M8 bolts"
              />
            </div>
            <div>
              <label htmlFor={`new-qty-${pkg.id}`} className="block text-xs text-gray-500 mb-1">Quantity</label>
              <input
                id={`new-qty-${pkg.id}`}
                type="number"
                min={1}
                step={1}
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addItem() }}
                className="w-24 px-2.5 py-1.5 border border-gray-300 rounded-lg text-sm text-right focus:outline-none focus:ring-1 focus:ring-gray-400"
              />
            </div>
            <Button size="sm" onClick={addItem} disabled={saving || !newProduct.trim() || !newQty}>
              {saving ? "Adding…" : "Add"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setAdding(false); setNewProduct(""); setNewQty(""); setError("") }}>
              Cancel
            </Button>
            {error && <p className="text-xs text-red-600 w-full">{error}</p>}
          </div>
        ) : (
          <Button size="sm" variant="secondary" className="mt-3" onClick={() => setAdding(true)}>
            <Plus size={13} className="mr-1.5" />
            Add Item
          </Button>
        )
      )}
    </div>
  )
}
