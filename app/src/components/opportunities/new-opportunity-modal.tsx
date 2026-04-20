"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { cn, QUOTE_STATUSES, STATUS_LABELS, todayISO } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface NewOpportunityModalProps {
  onClose: () => void
  onCreated: (newId: string) => void
}

interface NewForm {
  title: string
  status: string
  waitingOn: string
  internalId: string
  reference: string
  customer: string
  product: string
  rfqDate: string
  quoteSentDate: string
  description: string
}

export function NewOpportunityModal({ onClose, onCreated }: NewOpportunityModalProps) {
  const [form, setForm] = useState<NewForm>({
    title: "",
    status: "RFQ_RECEIVED",
    waitingOn: "INTERNAL",
    internalId: "",
    reference: "",
    customer: "",
    product: "",
    rfqDate: todayISO(),
    quoteSentDate: "",
    description: "",
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function setField(field: keyof NewForm, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleCreate() {
    if (!form.title.trim() || !form.customer.trim()) return
    setSaving(true)
    setError("")

    const res = await fetch("/api/opportunities", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    setSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Failed to create opportunity.")
      return
    }

    const data = await res.json()
    onCreated(data.id)
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-[4vh]">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />

        {/* Modal panel */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-8">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
            <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">
              New Opportunity
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={17} />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-6">
            {/* Title */}
            <div className="mb-5">
              <input
                value={form.title}
                onChange={(e) => setField("title", e.target.value)}
                placeholder="Opportunity title"
                autoFocus
                className="w-full text-2xl font-semibold text-gray-900 bg-transparent border-b-2 border-gray-200 focus:border-gray-900 outline-none pb-1 leading-tight placeholder-gray-300"
              />

              {/* Status + Pending + ID + Ref inline */}
              <div className="flex flex-wrap items-center gap-2 mt-3">
                <select
                  value={form.status}
                  onChange={(e) => setField("status", e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-full text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  {QUOTE_STATUSES.map((s) => (
                    <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <select
                  value={form.waitingOn}
                  onChange={(e) => setField("waitingOn", e.target.value)}
                  className="px-3 py-1 border border-gray-300 rounded-full text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
                >
                  <option value="INTERNAL">Internal</option>
                  <option value="CUSTOMER">Customer</option>
                </select>
                <label className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-300 rounded-full bg-white focus-within:ring-1 focus-within:ring-gray-400 cursor-text">
                  <span className="text-xs text-gray-400 shrink-0">ID</span>
                  <input
                    value={form.internalId}
                    onChange={(e) => setField("internalId", e.target.value)}
                    maxLength={10}
                    placeholder="—"
                    className="text-xs font-medium text-gray-900 bg-transparent outline-none w-14"
                  />
                </label>
                <label className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-300 rounded-full bg-white focus-within:ring-1 focus-within:ring-gray-400 cursor-text">
                  <span className="text-xs text-gray-400 shrink-0">Ref.</span>
                  <input
                    value={form.reference}
                    onChange={(e) => setField("reference", e.target.value)}
                    placeholder="—"
                    className="text-xs font-medium text-gray-900 bg-transparent outline-none w-24"
                  />
                </label>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              {/* Customer full width */}
              <FormCard label="Customer *" required className="col-span-2 md:col-span-4">
                <input
                  value={form.customer}
                  onChange={(e) => setField("customer", e.target.value)}
                  placeholder="Customer name"
                  className={inputCls}
                  required
                />
              </FormCard>

              {/* Product 50%, RFQ Date 25%, Quote Sent 25% */}
              <FormCard label="Product / Service" className="col-span-2">
                <input
                  value={form.product}
                  onChange={(e) => setField("product", e.target.value)}
                  placeholder="Requested product or service"
                  className={inputCls}
                />
              </FormCard>
              <FormCard label="RFQ Date">
                <input
                  type="date"
                  value={form.rfqDate}
                  onChange={(e) => setField("rfqDate", e.target.value)}
                  className={inputCls}
                />
              </FormCard>
              <FormCard label="Quote Sent Date">
                <input
                  type="date"
                  value={form.quoteSentDate}
                  onChange={(e) => setField("quoteSentDate", e.target.value)}
                  className={inputCls}
                />
              </FormCard>

              {/* Details full width */}
              <FormCard label="Details" className="col-span-2 md:col-span-4">
                <textarea
                  value={form.description}
                  onChange={(e) => setField("description", e.target.value)}
                  rows={3}
                  placeholder="Additional context, requirements, or background…"
                  className="w-full text-sm text-gray-700 bg-transparent resize-none focus:outline-none placeholder-gray-400"
                />
              </FormCard>
            </div>

            {error && (
              <p className="mb-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
              <Button
                onClick={handleCreate}
                disabled={saving || !form.title.trim() || !form.customer.trim()}
              >
                {saving ? "Creating…" : "Create Opportunity"}
              </Button>
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  "w-full text-sm font-medium text-gray-900 bg-transparent border-b border-gray-200 focus:border-gray-600 outline-none py-0.5 placeholder-gray-400"

function FormCard({
  label,
  children,
  className,
  required = false,
}: {
  label: string
  children: React.ReactNode
  className?: string
  required?: boolean
}) {
  return (
    <div className={cn("bg-white border border-gray-200 rounded-xl p-4", className)}>
      <p className="text-xs font-medium text-gray-400 mb-2">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </p>
      {children}
    </div>
  )
}
