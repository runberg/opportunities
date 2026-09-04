"use client"

import { useEffect, useState } from "react"
import { X } from "lucide-react"
import { Dialog } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Textarea } from "@/shared/components/ui/textarea"
import { FileDropZone } from "@/shared/components/ui/file-drop-zone"
import { FileTypeIcon } from "@/shared/components/ui/file-type-icon"
import { useDropZone } from "@/shared/lib/use-drop-zone"
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
  const [file, setFile] = useState<File | null>(null)
  const [removeExistingFile, setRemoveExistingFile] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const { dragging, onDragOver, onDragLeave, onDrop } = useDropZone(setFile)

  // Resync form fields whenever the target package changes — this dialog is a single
  // persistent instance (not remounted per target), so useState initializers alone only
  // run once and won't repopulate when switching between "new" and different packages.
  useEffect(() => {
    setName(pkg?.name ?? "")
    setComment(pkg?.comment ?? "")
    setOpportunityId(pkg?.opportunity?.id ?? null)
    setOpportunityLabel(pkg?.opportunity ? `${pkg.opportunity.title} — ${pkg.opportunity.customer}` : null)
    setFile(null)
    setRemoveExistingFile(false)
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

  const existingFile = pkg?.originalName && pkg?.mimeType && !removeExistingFile ? pkg : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!name.trim()) return
    setSaving(true)
    setError("")

    const fd = new FormData()
    fd.append("name", name.trim())
    fd.append("comment", comment.trim())
    fd.append("opportunityId", opportunityId ?? "")
    if (file) fd.append("file", file)
    if (removeExistingFile) fd.append("removeFile", "true")

    const url = pkg ? `/api/inventory/packages/${pkg.id}` : "/api/inventory/packages"
    const method = pkg ? "PATCH" : "POST"
    const res = await fetch(url, { method, body: fd })

    setSaving(false)
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Failed to save package.")
      return
    }

    await onSaved()
    handleClose()
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
          <Label htmlFor="pkg-opportunity">
            Opportunity <span className="font-normal text-gray-500">(optional — link, attach a document, or both)</span>
          </Label>
          <div className="space-y-2">
            <OpportunityPicker
              value={opportunityId}
              label={opportunityLabel}
              onChange={(o) => { setOpportunityId(o?.id ?? null); setOpportunityLabel(o ? `${o.title} — ${o.customer}` : null) }}
            />
            {existingFile ? (
              <div className="flex items-center justify-between px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-sm">
                <span className="inline-flex items-center gap-1.5 min-w-0">
                  <span className="inline-flex items-center justify-center w-[13px] h-4 shrink-0 [&_svg]:w-[13px] [&_svg]:h-4">
                    <FileTypeIcon mimeType={existingFile.mimeType!} />
                  </span>
                  <span className="text-gray-100 truncate">{existingFile.originalName}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setRemoveExistingFile(true)}
                  className="text-gray-400 hover:text-gray-200 shrink-0 ml-2"
                  title="Remove file"
                >
                  <X size={14} />
                </button>
              </div>
            ) : (
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
            )}
            <p className="text-xs text-gray-500">EL, quote, or other document — Word (.docx), PDF, or Excel</p>
          </div>
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
