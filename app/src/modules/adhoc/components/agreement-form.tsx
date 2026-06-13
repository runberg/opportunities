"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import type { AgreementRow } from "./adhoc-client"

type Props = {
  readonly agreement?: AgreementRow
  readonly onClose: () => void
  readonly onSaved: () => void
}

export function AgreementForm({ agreement, onClose, onSaved }: Props) {
  const isEdit = !!agreement
  const [title, setTitle] = useState(agreement?.title ?? "")
  const [totalAmount, setTotalAmount] = useState(
    agreement ? String(Number(agreement.totalAmount)) : ""
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit() {
    if (!title.trim()) { setError("Title is required"); return }
    if (!totalAmount || Number(totalAmount) <= 0) { setError("Total amount must be positive"); return }

    setSaving(true)
    setError(null)
    try {
      const url = isEdit ? `/api/adhoc/agreements/${agreement.id}` : "/api/adhoc/agreements"
      const res = await fetch(url, {
        method: isEdit ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), totalAmount: Number(totalAmount) }),
      })
      if (!res.ok) { setError((await res.json()).error ?? "Save failed"); return }
      onSaved()
    } finally {
      setSaving(false)
    }
  }

  let submitLabel: string
  if (saving) submitLabel = "Saving…"
  else if (isEdit) submitLabel = "Save Changes"
  else submitLabel = "Create"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button
        type="button"
        aria-label="Close"
        className="fixed inset-0 bg-black/40 cursor-default"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">
          {isEdit ? "Edit Agreement" : "New Agreement"}
        </h2>

        <div className="space-y-3">
          <div>
            <label htmlFor="agr-title" className="block text-xs font-medium text-gray-700 mb-1">Title</label>
            <input
              id="agr-title"
              autoFocus
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Maintenance Agreement 2026"
            />
          </div>

          <div>
            <label htmlFor="agr-amount" className="block text-xs font-medium text-gray-700 mb-1">Total Amount</label>
            <input
              id="agr-amount"
              type="number"
              min="0"
              step="0.01"
              className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0.00"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
            />
          </div>
        </div>

        {error && <p className="text-xs text-red-600 mt-3">{error}</p>}

        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={handleSubmit} disabled={saving}>
            {submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
