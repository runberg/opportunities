"use client"

import { Panel } from "@/shared/components/ui/panel"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Trash2 } from "lucide-react"
import { Input } from "@/shared/components/ui/input"
import { Button } from "@/shared/components/ui/button"
import type { UnitTypeOption } from "@/modules/opportunities/deliveries/types"

export function ProductsClient({ products }: { readonly products: UnitTypeOption[] }) {
  const router = useRouter()
  const [editing, setEditing] = useState<UnitTypeOption | null>(null)
  const [name, setName] = useState("")
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function resetForm() {
    setEditing(null)
    setName("")
    setError("")
  }

  async function changeProduct(method: "POST" | "PATCH" | "DELETE", id?: string) {
    setSaving(true)
    setError("")
    try {
      const response = await fetch(id ? `/api/opportunities/unit-types/${id}` : "/api/opportunities/unit-types", {
        method,
        ...(method !== "DELETE" && { headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) }),
      })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? "Could not update products.")
      if (method !== "DELETE" || editing?.id === id) resetForm()
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not update products.")
    } finally {
      setSaving(false)
    }
  }

  function deleteProduct(product: UnitTypeOption) {
    if (window.confirm(`Delete "${product.name}" from Products?`)) void changeProduct("DELETE", product.id)
  }

  return (
    <Panel className="p-5">
      <form className="flex max-w-2xl flex-wrap items-end gap-2" onSubmit={(event) => {
        event.preventDefault()
        void changeProduct(editing ? "PATCH" : "POST", editing?.id)
      }}>
        <label className="min-w-40 flex-1 space-y-1 text-sm text-gray-900">
          <span>{editing ? "Edit product name" : "New product name"}</span>
          <Input value={name} onChange={(event) => setName(event.target.value)}
            required maxLength={120} disabled={saving} />
        </label>
        <Button type="submit" disabled={saving || !name.trim()}>{editing ? "Save" : "Add"}</Button>
        {editing && <Button type="button" variant="ghost" disabled={saving} onClick={resetForm}>Cancel</Button>}
      </form>
      {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
      {products.length === 0 ? <p className="mt-4 text-sm text-gray-400">No products yet.</p> : (
        <ul className="mt-4 divide-y divide-gray-100 border-t border-gray-200">
          {products.map((product) => (
            <li key={product.id} className="flex items-center gap-2 py-2 text-sm text-gray-900">
              <span className="min-w-0 flex-1 break-words">{product.name}</span>
              <button type="button" disabled={saving} aria-label={`Edit ${product.name}`} title="Edit product"
                className="rounded p-1.5 text-gray-400 hover:text-blue-300" onClick={() => {
                  setEditing(product)
                  setName(product.name)
                  setError("")
                }}><Pencil size={15} /></button>
              <button type="button" disabled={saving} aria-label={`Delete ${product.name}`} title="Delete product"
                className="rounded p-1.5 text-gray-400 hover:text-red-600" onClick={() => deleteProduct(product)}><Trash2 size={15} /></button>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}
