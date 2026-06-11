"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Select } from "@/shared/components/ui/select"
import { Textarea } from "@/shared/components/ui/textarea"
import { QUOTE_STATUSES, STATUS_LABELS, todayISO } from "@/shared/lib/utils"

interface OpportunityFormProps {
  readonly mode: "create" | "edit"
  readonly initialData?: {
    readonly id?: string
    readonly internalId?: string
    readonly title?: string
    readonly customer?: string
    readonly reference?: string
    readonly rfqDate?: string
    readonly product?: string
    readonly status?: string
    readonly waitingOn?: string
    readonly description?: string
  }
}

export function OpportunityForm({ mode, initialData = {} }: OpportunityFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [form, setForm] = useState({
    internalId: initialData.internalId ?? "",
    title: initialData.title ?? "",
    customer: initialData.customer ?? "",
    reference: initialData.reference ?? "",
    rfqDate: initialData.rfqDate ?? todayISO(),
    product: initialData.product ?? "",
    status: initialData.status ?? "RFQ_RECEIVED",
    waitingOn: initialData.waitingOn ?? "INTERNAL",
    description: initialData.description ?? "",
  })

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)

    const url =
      mode === "create"
        ? "/api/opportunities"
        : `/api/opportunities/${initialData.id}`
    const method = mode === "create" ? "POST" : "PATCH"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Something went wrong. Please try again.")
      return
    }

    const data = await res.json()
    if (mode === "create") {
      router.push("/opportunities")
    } else {
      router.push(`/opportunities/${data.id}`)
    }
    router.refresh()
  }

  let submitLabel: string
  if (saving) submitLabel = "Saving…"
  else if (mode === "create") submitLabel = "Create Opportunity"
  else submitLabel = "Save Changes"

  return (
    <form onSubmit={handleSubmit} className="space-y-4">

      {/* Row 1: Title + Internal ID */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            required
            placeholder="e.g. Hydraulic System Supply — ACME Q1"
          />
        </div>
        <div className="w-28 flex-shrink-0">
          <Label htmlFor="internalId">Internal ID</Label>
          <Input
            id="internalId"
            value={form.internalId}
            onChange={(e) => set("internalId", e.target.value)}
            placeholder="0001"
            maxLength={10}
          />
        </div>
      </div>

      {/* Row 2: Customer + Quote Reference */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="customer">Customer *</Label>
          <Input
            id="customer"
            value={form.customer}
            onChange={(e) => set("customer", e.target.value)}
            required
            placeholder="Customer name"
          />
        </div>
        <div>
          <Label htmlFor="reference">Quote Reference</Label>
          <Input
            id="reference"
            value={form.reference}
            onChange={(e) => set("reference", e.target.value)}
            placeholder="Customer or RFQ reference"
          />
        </div>
      </div>

      {/* Row 3: RFQ Date + Product */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="rfqDate">RFQ Date</Label>
          <Input
            id="rfqDate"
            type="date"
            value={form.rfqDate}
            onChange={(e) => set("rfqDate", e.target.value)}
          />
        </div>
        <div>
          <Label htmlFor="product">Product / Service</Label>
          <Input
            id="product"
            value={form.product}
            onChange={(e) => set("product", e.target.value)}
            placeholder="Requested product or service"
          />
        </div>
      </div>

      {/* Row 4: Status + Pending */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="status">Status *</Label>
          <Select
            id="status"
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
          >
            {QUOTE_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </Select>
        </div>
        <div>
          <Label htmlFor="waitingOn">Pending</Label>
          <Select
            id="waitingOn"
            value={form.waitingOn}
            onChange={(e) => set("waitingOn", e.target.value)}
          >
            <option value="INTERNAL">Internal</option>
            <option value="CUSTOMER">Customer</option>
          </Select>
        </div>
      </div>

      {/* Row 5: Notes */}
      <div>
        <Label htmlFor="description">Notes</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          placeholder="Additional context, requirements, or background…"
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3 pt-1">
        <Button type="submit" disabled={saving}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>
          Cancel
        </Button>
      </div>
    </form>
  )
}
