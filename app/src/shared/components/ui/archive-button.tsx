"use client"

import { useState } from "react"
import { Button } from "./button"

export function ArchiveButton({ endpoint, isArchived, onSaved }: {
  readonly endpoint: string
  readonly isArchived: boolean
  readonly onSaved: () => void | Promise<void>
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function toggleArchive() {
    setSaving(true)
    setError("")
    try {
      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !isArchived }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Failed to update archive status")
        return
      }
      await onSaved()
    } catch {
      setError("Failed to update archive status. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button variant="secondary" size="sm" disabled={saving} onClick={toggleArchive}>
        {saving ? "Saving…" : isArchived ? "Unarchive" : "Archive"}
      </Button>
      {isArchived && <span className="text-xs text-gray-400">Archived · Unarchive to resume the previous stage.</span>}
      {error && <span role="alert" className="text-xs text-red-500">{error}</span>}
    </div>
  )
}
