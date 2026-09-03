"use client"

import { useEffect, useState } from "react"
import { Dialog } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { OpportunityPicker } from "./opportunity-picker"
import type { PackageRow } from "./inventory-client"

type Props = {
  readonly open: boolean
  readonly pkg: PackageRow | null
  readonly onClose: () => void
  readonly onSaved: () => Promise<void>
}

export function PackageForm({ open, pkg, onClose, onSaved }: Props) {
  const [name, setName] = useState("")
  const [comment, setComment] = useState("")
  const [opportunityId, setOpportunityId] = useState<string | null>(null)
  const [opportunityLabel, setOpportunityLabel] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  // Resync form fields whenever the target package changes — this dialog is a single
  // persistent instance (not remounted per target), so useState initializers alone only
  // run once and won't repopulate when switching between "new" and different packages.
  useEffect(() => {
    setName(pkg?.name ?? "")
    setComment(pkg?.comment ?? "")
    setOpportunityId(pkg?.opportunity?.id ?? null)
    setOpportunityLabel(pkg?.opportunity ? `${pkg.opportunity.title} — ${pkg.opportunity.customer}` : null)
    setError("")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pkg?.id, open])

  function handleClose() {
    onClose()
  }

  function submitLabel(): string {
    if (saving) return "Saving…"
    return pkg ? "Save Changes" : "Create Package"
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError("")

    const url = pkg ? `/api/inventory/packages/${pkg.id}` : "/api/inventory/packages"
    const method = pkg ? "PATCH" : "POST"
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), comment: comment.trim() || null, opportunityId }),
    })

    setSaving(false)
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Failed to save package.")
      return
    }

    handleClose()
    await onSaved()
  }

  return (
    <Dialog open={open} onClose={handleClose} title={pkg ? "Edit Inventory Package" : "New Inventory Package"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="pkg-name">Name *</Label>
          <Input
            id="pkg-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Spare parts — Project Atlas"
            required
          />
        </div>
        <div>
          <Label htmlFor="pkg-opportunity">Linked Opportunity <span className="font-normal text-gray-500">(optional)</span></Label>
          <OpportunityPicker
            value={opportunityId}
            label={opportunityLabel}
            onChange={(o) => { setOpportunityId(o?.id ?? null); setOpportunityLabel(o ? `${o.title} — ${o.customer}` : null) }}
          />
        </div>
        <div>
          <Label htmlFor="pkg-comment">Comments <span className="font-normal text-gray-500">(optional)</span></Label>
          <Textarea
            id="pkg-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Notes about this package…"
          />
        </div>
        {error && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
        <div className="flex gap-2 pt-1">
          <Button type="submit" disabled={saving || !name.trim()}>{submitLabel()}</Button>
          <Button type="button" variant="ghost" onClick={handleClose}>Cancel</Button>
        </div>
      </form>
    </Dialog>
  )
}
