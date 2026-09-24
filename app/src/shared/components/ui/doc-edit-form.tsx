"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { useAutoFocus } from "@/shared/lib/use-autofocus"

export type DocTypeOption = { value: string; label: string }

/** Inline form for correcting a document's display name and (optionally) its type after
 * upload. Shared by every document list; each caller supplies the PATCH url and the type
 * options valid for that document table. */
export function DocEditForm({
  url,
  initialName,
  initialType,
  typeOptions,
  onSaved,
  onCancel,
}: {
  readonly url: string
  readonly initialName: string
  readonly initialType: string
  readonly typeOptions: DocTypeOption[] | null
  readonly onSaved: () => void | Promise<void>
  readonly onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [type, setType] = useState(initialType)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nameRef = useAutoFocus<HTMLInputElement>()

  async function handleSave() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: name.trim(), ...(typeOptions && { type }) }),
      })
      if (!res.ok) { setError((await res.json().catch(() => ({}))).error ?? "Save failed"); return }
      await onSaved()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-wrap items-end gap-2 px-4 py-3 bg-gray-800/60">
      <div className="flex-1 min-w-48">
        <label htmlFor="doc-edit-name" className="block text-xs text-gray-400 mb-1">Name</label>
        <input
          id="doc-edit-name"
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) void handleSave()
            if (e.key === "Escape") onCancel()
          }}
          className="w-full rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {typeOptions && (
        <div>
          <label htmlFor="doc-edit-type" className="block text-xs text-gray-400 mb-1">Type</label>
          <select
            id="doc-edit-type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {typeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      )}
      <Button size="sm" onClick={() => void handleSave()} disabled={saving || !name.trim()}>
        {saving ? "Saving…" : "Save"}
      </Button>
      <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
    </div>
  )
}
