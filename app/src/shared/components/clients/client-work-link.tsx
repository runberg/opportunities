"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { useAutoFocus } from "@/shared/lib/use-autofocus"

type Client = { id: string; codeName: string; name?: string }

export function ClientWorkLink({ kind, workId, clientId, onSaved }: {
  readonly kind: "opportunities" | "adhoc"
  readonly workId: string
  readonly clientId: string | null
  readonly onSaved: () => void | Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [clients, setClients] = useState<Client[] | null>(null)
  const [query, setQuery] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(false)
  const searchRef = useAutoFocus<HTMLInputElement>()
  const label = clientId ? "Change client" : "Link client"

  async function openPicker() {
    setOpen(true)
    setQuery("")
    setClients(null)
    setError("")
    setLoading(true)
    try {
      const response = await fetch("/api/clients")
      if (!response.ok) throw new Error("Could not load clients.")
      setClients(await response.json())
    } catch {
      setError("Could not load clients.")
    } finally {
      setLoading(false)
    }
  }

  async function save(id: string, action: "link" | "unlink") {
    setSaving(true)
    setError("")
    try {
      const response = await fetch(`/api/clients/${id}/work`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, workId, expectedClientId: clientId, action }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error ?? "Could not update the client link.")
      }
      await onSaved()
      setOpen(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not update the client link.")
    } finally {
      setSaving(false)
    }
  }

  const match = query.trim().toLowerCase()
  const visible = clients?.filter(({ codeName, name }) =>
    codeName.toLowerCase().includes(match) || name?.toLowerCase().includes(match),
  )

  return (
    <div className="mt-1">
      <Button size="sm" variant="ghost" aria-expanded={open}
        disabled={saving || loading} onClick={() => open ? setOpen(false) : void openPicker()}>{label}</Button>
      {open && (
        <div className="mt-1 space-y-2 rounded-lg border border-gray-600 bg-gray-800 p-3" aria-label={label} role="group">
          <Input ref={searchRef} aria-label="Search clients" placeholder="Search by code name or real name"
            value={query} onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Escape") return
              event.stopPropagation()
              if (!saving && !loading) setOpen(false)
            }} />
          {loading && <p role="status" className="text-xs text-gray-300">Loading clients…</p>}
          {visible?.length === 0 && <p className="text-xs text-gray-300">No matching clients.</p>}
          {visible && visible.length > 0 && (
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {visible.map((client) => (
                <li key={client.id}>
                  <Button variant="ghost" size="sm" title={client.name}
                    disabled={saving || client.id === clientId} onClick={() => void save(client.id, "link")}>
                    {client.codeName}{client.id === clientId && " (current)"}
                  </Button>
                </li>
              ))}
            </ul>
          )}
          {error && <p role="alert" className="text-xs text-red-300">{error}</p>}
          <div className="flex gap-2">
            {clientId && <Button size="sm" variant="danger" disabled={saving} onClick={() => void save(clientId, "unlink")}>Remove link</Button>}
            <Button size="sm" variant="ghost" disabled={saving || loading} onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}
