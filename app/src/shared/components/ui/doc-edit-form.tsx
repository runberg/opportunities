"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { useAutoFocus } from "@/shared/lib/use-autofocus"

/** `group` (optional) renders the option under an <optgroup>, e.g. the section it belongs to. */
export type DocTypeOption = { value: string; label: string; group?: string }

const VERSION_OPTIONS = [
  { value: "DRAFT", label: "Draft" },
  { value: "FINAL", label: "Final" },
]

const selectCls = "rounded border border-gray-600 bg-gray-700 px-2 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"

function TypeSelect({ id, value, options, onChange }: {
  readonly id: string
  readonly value: string
  readonly options: DocTypeOption[]
  readonly onChange: (v: string) => void
}) {
  const groups = [...new Set(options.map((o) => o.group ?? ""))]
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={selectCls}>
      {groups.map((g) => {
        const items = options.filter((o) => (o.group ?? "") === g)
        const rendered = items.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)
        return g ? <optgroup key={g} label={g}>{rendered}</optgroup> : rendered
      })}
    </select>
  )
}

/** Inline form for correcting a document after upload: its name, type (which also decides the
 * section it appears in) and, when `initialVersion` is given, its Draft/Final version.
 * Shared by every document list; each caller supplies the PATCH url and the options valid
 * for that document table. */
export function DocEditForm({
  url,
  initialName,
  initialType,
  typeOptions,
  initialVersion = null,
  onSaved,
  onCancel,
}: {
  readonly url: string
  readonly initialName: string
  readonly initialType: string
  readonly typeOptions: DocTypeOption[] | null
  readonly initialVersion?: string | null
  readonly onSaved: () => void | Promise<void>
  readonly onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [type, setType] = useState(initialType)
  const [version, setVersion] = useState(initialVersion ?? "DRAFT")
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
        body: JSON.stringify({
          displayName: name.trim(),
          ...(typeOptions && { type }),
          ...(initialVersion !== null && { docStatus: version }),
        }),
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
          <TypeSelect id="doc-edit-type" value={type} options={typeOptions} onChange={setType} />
        </div>
      )}
      {initialVersion !== null && (
        <div>
          <label htmlFor="doc-edit-version" className="block text-xs text-gray-400 mb-1">Version</label>
          <TypeSelect id="doc-edit-version" value={version} options={VERSION_OPTIONS} onChange={setVersion} />
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
