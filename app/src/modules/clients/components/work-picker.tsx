"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { clientRequest } from "./client-forms"
import type { WorkPreset } from "./clients-list"
import type { WorkKind } from "../validation"

type Work = { id: string; title: string; internalId: string | null; customer: string | null; clientId: string | null }

export function workLabel(kind: WorkKind) {
  return kind === "opportunities" ? "opportunity" : "Ad Hoc package"
}

export function WorkPicker({
  clientId, codeName, kind, preset, onClose,
}: {
  readonly clientId: string
  readonly codeName: string
  readonly kind: WorkKind
  readonly preset?: WorkPreset
  readonly onClose: () => void
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  const [items, setItems] = useState<Work[]>([])
  const [selected, setSelected] = useState<Work | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const endpoint = `/api/clients/${clientId}/work`
  const workId = preset?.workId

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams({ kind, q: search, ...(workId && { workId }) })
    async function load() {
      setLoading(true)
      setError("")
      try {
        const response = await fetch(`${endpoint}?${params}`, { signal: controller.signal })
        if (!response.ok) throw new Error("Could not load work items.")
        const results: Work[] = await response.json()
        if (controller.signal.aborted) return
        setItems(results)
        setSelected(workId ? results[0] ?? null : null)
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Search failed.")
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [endpoint, kind, search, workId])

  async function confirm() {
    if (!selected) return
    setSaving(true)
    setError("")
    try {
      await clientRequest(endpoint, "POST", { kind, workId: selected.id, expectedClientId: selected.clientId, action: "link" })
      onClose()
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not link this item.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 p-4" aria-label={`Link ${workLabel(kind)}`}>
      <h3 className="font-semibold">Link {workLabel(kind)}</h3>
      {!workId && (
        <form className="flex gap-2" onSubmit={(event) => { event.preventDefault(); setSearch(query.trim()) }}>
          <Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search by title or internal ID"
            placeholder="Search by title or internal ID" maxLength={160} disabled={saving} />
          <Button type="submit" disabled={saving}>Search</Button>
        </form>
      )}
      {loading && <p role="status" className="text-sm text-gray-600">Loading work items…</p>}
      {!loading && !items.length && <p className="text-sm text-gray-600">No eligible work items found.</p>}
      {!loading && !workId && items.length > 0 && (
        <ul className="max-h-56 divide-y divide-gray-100 overflow-y-auto">
          {items.map((item) => (
            <li key={item.id}>
              <button type="button" aria-pressed={selected?.id === item.id} disabled={saving}
                className="w-full rounded px-2 py-2 text-left text-sm hover:bg-blue-50 aria-pressed:bg-blue-100"
                onClick={() => setSelected(item)}>
                {item.internalId && `${item.internalId} · `}{item.title}
                <span className="block text-xs text-gray-600">{item.customer ?? "No customer"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {selected && !loading && (
        <p className="text-sm text-gray-700">
          {selected.clientId === clientId
            ? `${selected.title} is already linked to ${codeName}.`
            : `${selected.title} · Current customer: ${selected.customer ?? "none"}. ${selected.clientId ? "Move" : "Link"} to ${codeName}?`}
        </p>
      )}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        {selected && selected.clientId !== clientId && !loading && (
          <Button type="button" disabled={saving} onClick={() => void confirm()}>{selected.clientId ? "Move link" : "Link work"}</Button>
        )}
        <Button type="button" variant="ghost" disabled={saving} onClick={onClose}>Close</Button>
      </div>
    </section>
  )
}
