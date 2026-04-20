"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X, Pencil } from "lucide-react"
import {
  cn, formatDate,
  QUOTE_STATUSES, EL_STATUSES, PRODUCTION_STATUSES, STATUS_LABELS,
  todayISO, toDateString,
} from "@/lib/utils"
import { StatusBadge, PendingBadge } from "@/components/opportunities/status-badge"
import { QuoteSection } from "@/components/opportunities/quote-section"
import { ProductionSection } from "@/components/opportunities/production-section"
import { LogSection, type LogEntry } from "@/components/opportunities/log-section"
import { Button } from "@/components/ui/button"

const ALL_EL_STATUSES = [...EL_STATUSES, "EL_FULLY_SIGNED"]

const STATUS_DATE_REQUIRED: Record<string, { field: string; label: string }> = {
  RFQ_RECEIVED:        { field: "rfqDate",           label: "RFQ Date" },
  QUOTE_SENT:          { field: "quoteSentDate",      label: "Quote Shared" },
  EL_REQUEST_RECEIVED: { field: "elRequestedDate",    label: "EL Requested" },
  EL_DRAFT_SHARED:     { field: "elDraftSharedDate",  label: "EL Draft Shared" },
  EL_SIGNED_SHARED:    { field: "elSignedSharedDate", label: "EL Signed Shared" },
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface ModalDoc {
  id: string; displayName: string; originalName: string
  mimeType: string; size: number; type: string; docStatus: string
  uploadedAt: string; uploadedBy: { id: string; name: string }
}

interface OpportunityFull {
  id: string; internalId: string | null; title: string; customer: string
  reference: string | null; rfqDate: string | null; product: string | null
  status: string; waitingOn: string
  quoteSentDate: string | null; elRequestedDate: string | null
  elDraftSharedDate: string | null; elSignedSharedDate: string | null
  advancePaymentDate: string | null; fatDate: string | null
  fatPassedDate: string | null; satApplicable: boolean
  satDate: string | null; satPassedDate: string | null; deliveredDate: string | null
  description: string | null; createdAt: string; updatedAt: string
  createdBy: { id: string; name: string }
  comments: LogEntry[]; documents: ModalDoc[]
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export function OpportunityModal({
  opportunityId, onClose, currentUserId, isAdmin, initialAccept = false,
}: {
  opportunityId: string | null
  onClose: () => void
  currentUserId: string
  isAdmin: boolean
  initialAccept?: boolean
}) {
  const router = useRouter()
  const [data, setData] = useState<OpportunityFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  // Full refresh — triggers loading spinner, remounts ViewMode
  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    router.refresh()
  }, [router])

  // Silent refresh — updates data in-place, ViewMode stays mounted
  const silentRefresh = useCallback(() => {
    if (!opportunityId) return
    fetch(`/api/opportunities/${opportunityId}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d) })
  }, [opportunityId])

  useEffect(() => {
    if (!opportunityId) { setData(null); return }
    setLoading(true)
    setFetchError("")
    fetch(`/api/opportunities/${opportunityId}`)
      .then((r) => { if (!r.ok) throw new Error(); return r.json() })
      .then((d) => { setData(d); setLoading(false) })
      .catch(() => { setFetchError("Failed to load opportunity."); setLoading(false) })
  }, [opportunityId, refreshKey])

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  useEffect(() => {
    if (opportunityId) document.body.style.overflow = "hidden"
    return () => { document.body.style.overflow = "" }
  }, [opportunityId])

  if (!opportunityId) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-[4vh]">
        <div className="fixed inset-0 bg-black/40" onClick={onClose} />
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-8">
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
            <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">
              {data && (PRODUCTION_STATUSES as readonly string[]).includes(data.status)
                ? "Production"
                : data && ALL_EL_STATUSES.includes(data.status)
                ? "Engagement Letter"
                : "Quote"}
            </span>
            <button type="button" onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={17} />
            </button>
          </div>
          <div className="px-6 py-6">
            {loading && <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>}
            {fetchError && <div className="py-16 text-center text-red-500 text-sm">{fetchError}</div>}
            {!loading && !fetchError && data && (
              <ViewMode
                data={data}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onRefresh={refresh}
                onSilentRefresh={silentRefresh}
                initialAccept={initialAccept}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── View mode ────────────────────────────────────────────────────────────────

function ViewMode({ data, currentUserId, isAdmin, onRefresh, onSilentRefresh, initialAccept }: {
  data: OpportunityFull
  currentUserId: string
  isAdmin: boolean
  onRefresh: () => void
  onSilentRefresh: () => void
  initialAccept?: boolean
}) {
  const isEL = ALL_EL_STATUSES.includes(data.status)
  const isProduction = (PRODUCTION_STATUSES as readonly string[]).includes(data.status)
  const canAcceptQuote = data.status === "QUOTE_SENT"

  const [acceptingQuote, setAcceptingQuote] = useState(initialAccept ?? false)
  const [elDate, setElDate] = useState(todayISO())
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState("")

  const [counterSigning, setCounterSigning] = useState(false)
  const [counterSigning2, setCounterSigning2] = useState(false)
  const [counterSignError, setCounterSignError] = useState("")

  // Patch helper — use silent refresh so ViewMode stays mounted during field edits
  async function patch(payload: Record<string, unknown>): Promise<string | null> {
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        return d.error ?? "Failed to save."
      }
      onSilentRefresh()
      return null
    } catch {
      return "Network error. Please try again."
    }
  }

  async function handleAcceptQuote() {
    setAccepting(true)
    setAcceptError("")
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "EL_REQUEST_RECEIVED", elRequestedDate: elDate }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setAcceptError(d.error ?? "Failed to save. Please try again.")
      } else {
        setAcceptingQuote(false)
        onRefresh()
      }
    } catch {
      setAcceptError("Network error. Please try again.")
    } finally {
      setAccepting(false)
    }
  }

  async function handleCounterSigned() {
    setCounterSigning2(true)
    setCounterSignError("")
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING_ADVANCE_PAYMENT", waitingOn: "CUSTOMER" }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setCounterSignError(d.error ?? "Failed to save. Please try again.")
      } else {
        setCounterSigning(false)
        onRefresh()
      }
    } catch {
      setCounterSignError("Network error. Please try again.")
    } finally {
      setCounterSigning2(false)
    }
  }

  return (
    <div>
      {/* Title row */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <HoverEditTitle value={data.title} onSave={(v) => patch({ title: v })} />
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          {canAcceptQuote && !acceptingQuote && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0"
              onClick={() => setAcceptingQuote(true)}>
              Quote Accepted →
            </Button>
          )}
          {data.status === "EL_SIGNED_SHARED" && !counterSigning && (
            <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white border-0"
              onClick={() => setCounterSigning(true)}>
              Counter-signed EL Received →
            </Button>
          )}
        </div>
      </div>

      {/* Status/meta row */}
      <HoverEditMeta data={data} onSave={patch} />

      {/* Quote accepted panel */}
      {acceptingQuote && (
        <div className="mb-5 flex flex-wrap items-end gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div>
            <p className="text-xs font-semibold text-green-800 mb-1">Transition to Engagement Letter</p>
            <p className="text-xs text-green-700 mb-3">This will move the opportunity to the EL stage.</p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-green-700">EL Requested</span>
              <input type="date" value={elDate} onChange={(e) => setElDate(e.target.value)}
                className="text-xs border border-green-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-400" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleAcceptQuote} disabled={accepting || !elDate}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
              {accepting ? "Saving…" : "Confirm"}
            </button>
            <button type="button" onClick={() => { setAcceptingQuote(false); setAcceptError("") }}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800">
              Cancel
            </button>
          </div>
          {acceptError && <p className="w-full text-xs text-red-600">{acceptError}</p>}
        </div>
      )}

      {/* Counter-sign panel */}
      {counterSigning && (
        <div className="mb-5 flex flex-wrap items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <p className="text-xs font-semibold text-green-800">
            Confirm counter-signed EL received — this will transition the opportunity to Production.
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={handleCounterSigned} disabled={counterSigning2}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
              {counterSigning2 ? "Saving…" : "Confirm"}
            </button>
            <button type="button" onClick={() => { setCounterSigning(false); setCounterSignError("") }}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800">
              Cancel
            </button>
          </div>
          {counterSignError && <p className="text-xs text-red-600">{counterSignError}</p>}
        </div>
      )}

      {/* Info section — each field hover-editable */}
      <div className="flex flex-col gap-3 mb-5">
        <HoverEditField label="Customer" value={data.customer} required
          onSave={(v) => patch({ customer: v })} />
        <HoverEditField label="Product / Service" value={data.product}
          onSave={(v) => patch({ product: v })} />
        <HoverEditDates data={data} onSave={patch} />
        <HoverEditField label="Details" value={data.description} multiline
          onSave={(v) => patch({ description: v })} />
      </div>

      {/* Documents, Production, Log — always visible */}
      <QuoteSection opportunityId={data.id}
        documents={data.documents.filter((d) => d.type === "QUOTE")}
        currentUserId={currentUserId} isAdmin={isAdmin} onRefresh={onRefresh} docType="QUOTE" />

      {(isEL || isProduction) && (
        <div className="mt-4">
          <QuoteSection opportunityId={data.id}
            documents={data.documents.filter((d) => d.type === "EL")}
            currentUserId={currentUserId} isAdmin={isAdmin} onRefresh={onRefresh} docType="EL" />
        </div>
      )}

      {isProduction && (
        <ProductionSection data={data} currentUserId={currentUserId} isAdmin={isAdmin} onRefresh={onRefresh} />
      )}

      <LogSection opportunityId={data.id} entries={data.comments}
        currentUser={{ id: currentUserId, name: "" }} onRefresh={onRefresh} />
    </div>
  )
}

// ─── Hover-edit: Title ────────────────────────────────────────────────────────

function HoverEditTitle({ value, onSave }: {
  value: string
  onSave: (v: string) => Promise<string | null>
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value)

  async function save() {
    if (!draft.trim() || draft === value) { setEditing(false); return }
    await onSave(draft.trim())
    setEditing(false)
  }

  if (editing) {
    return (
      <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus
        onBlur={save}
        onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setDraft(value); setEditing(false) } }}
        className="flex-1 min-w-0 text-2xl font-semibold text-gray-900 bg-transparent border-b-2 border-gray-200 focus:border-gray-900 outline-none pb-1 leading-tight"
      />
    )
  }

  return (
    <div className="group flex items-center gap-2 flex-1 min-w-0 cursor-text"
      onClick={() => { setDraft(value); setEditing(true) }}>
      <h1 className="text-2xl font-semibold text-gray-900 leading-tight">{value}</h1>
      <Pencil size={13} className="opacity-0 group-hover:opacity-100 text-gray-400 flex-shrink-0 transition-opacity" />
    </div>
  )
}

// ─── Hover-edit: Status/meta row ──────────────────────────────────────────────

function HoverEditMeta({ data, onSave }: {
  data: OpportunityFull
  onSave: (payload: Record<string, unknown>) => Promise<string | null>
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ status: data.status, waitingOn: data.waitingOn, internalId: data.internalId ?? "", reference: data.reference ?? "" })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const isEL = ALL_EL_STATUSES.includes(form.status)
  const isProd = (PRODUCTION_STATUSES as readonly string[]).includes(form.status)
  const statusOptions = isProd
    ? ["PENDING_ADVANCE_PAYMENT", "IN_PRODUCTION", "DELIVERED"]
    : isEL ? [...EL_STATUSES, "EL_FULLY_SIGNED"]
    : QUOTE_STATUSES

  function enter() {
    setForm({ status: data.status, waitingOn: data.waitingOn, internalId: data.internalId ?? "", reference: data.reference ?? "" })
    setError("")
    setEditing(true)
  }

  async function save() {
    const req = STATUS_DATE_REQUIRED[form.status]
    if (req) {
      const existing = data[req.field as keyof OpportunityFull] as string | null
      if (!existing) {
        setError(`"${STATUS_LABELS[form.status]}" requires the "${req.label}" date to be set first.`)
        return
      }
    }
    // Auto-advance: if quote date was just set and status is RFQ_RECEIVED, bump to QUOTE_SENT
    const payload = { ...form }
    setSaving(true)
    const err = await onSave(payload)
    setSaving(false)
    if (err) { setError(err); return }
    setEditing(false)
    setError("")
  }

  if (editing) {
    return (
      <div className="mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
            className="px-3 py-1 border border-gray-300 rounded-full text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-gray-400">
            {statusOptions.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
          <select value={form.waitingOn} onChange={(e) => setForm((f) => ({ ...f, waitingOn: e.target.value }))}
            className="px-3 py-1 border border-gray-300 rounded-full text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-gray-400">
            <option value="INTERNAL">Internal</option>
            <option value="CUSTOMER">Customer</option>
          </select>
          <label className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-300 rounded-full bg-white focus-within:ring-1 focus-within:ring-gray-400">
            <span className="text-xs text-gray-400 shrink-0">ID</span>
            <input value={form.internalId} onChange={(e) => setForm((f) => ({ ...f, internalId: e.target.value }))}
              maxLength={10} placeholder="—" className="text-xs font-medium text-gray-900 bg-transparent outline-none w-14" />
          </label>
          <label className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-300 rounded-full bg-white focus-within:ring-1 focus-within:ring-gray-400">
            <span className="text-xs text-gray-400 shrink-0">Ref.</span>
            <input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
              placeholder="—" className="text-xs font-medium text-gray-900 bg-transparent outline-none w-24" />
          </label>
          <button type="button" onClick={save} disabled={saving}
            className="px-3 py-1 bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium rounded-full disabled:opacity-50 transition-colors">
            {saving ? "…" : "Save"}
          </button>
          <button type="button" onClick={() => { setEditing(false); setError("") }}
            className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg transition-colors">
            <X size={13} />
          </button>
        </div>
        {error && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="group flex flex-wrap items-center gap-2 mb-5 cursor-pointer" onClick={enter}>
      <StatusBadge status={data.status} />
      <PendingBadge waitingOn={data.waitingOn} />
      {data.internalId && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          {data.internalId}
        </span>
      )}
      {data.reference && (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
          {data.reference}
        </span>
      )}
      <Pencil size={11} className="opacity-0 group-hover:opacity-100 text-gray-400 transition-opacity" />
    </div>
  )
}

// ─── Hover-edit: Info card ────────────────────────────────────────────────────

function HoverEditField({ label, value, onSave, required = false, multiline = false }: {
  label: string
  value: string | null | undefined
  onSave: (v: string) => Promise<string | null>
  required?: boolean
  multiline?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? "")
  const [error, setError] = useState("")

  async function save() {
    if (required && !draft.trim()) { setEditing(false); return }
    const err = await onSave(draft)
    if (err) { setError(err); return }
    setEditing(false)
    setError("")
  }

  if (editing) {
    return (
      <div className="bg-white border border-gray-400 rounded-xl p-4">
        <p className="text-xs font-medium text-gray-400 mb-2">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </p>
        {multiline ? (
          <textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus
            placeholder="Additional context, requirements, or background…"
            className="w-full text-sm text-gray-700 bg-transparent resize-none focus:outline-none placeholder-gray-400" />
        ) : (
          <input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false) } }}
            className="w-full text-sm font-medium text-gray-900 bg-transparent border-b border-gray-200 focus:border-gray-600 outline-none py-0.5"
          />
        )}
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <div className="flex gap-2 mt-3">
          <button type="button" onClick={save}
            className="px-3 py-1 bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium rounded-lg transition-colors">
            Save
          </button>
          <button type="button" onClick={() => { setDraft(value ?? ""); setEditing(false); setError("") }}
            className="px-3 py-1 text-xs text-gray-500 hover:text-gray-700">
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="group relative bg-white border border-gray-200 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-400 mb-1">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </p>
      <p className={cn("text-sm font-medium", value ? "text-gray-900" : "text-gray-400")}>
        {multiline && value
          ? <span className="whitespace-pre-wrap font-normal text-gray-700">{value}</span>
          : (value ?? "—")}
      </p>
      <button type="button" onClick={() => { setDraft(value ?? ""); setError(""); setEditing(true) }}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
        <Pencil size={11} />
      </button>
    </div>
  )
}

// ─── Hover-edit: Dates row ────────────────────────────────────────────────────

function HoverEditDates({ data, onSave }: {
  data: OpportunityFull
  onSave: (payload: Record<string, unknown>) => Promise<string | null>
}) {
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    rfqDate:           toDateString(data.rfqDate),
    quoteSentDate:     toDateString(data.quoteSentDate),
    elRequestedDate:   toDateString(data.elRequestedDate),
    elDraftSharedDate: toDateString(data.elDraftSharedDate),
    elSignedSharedDate:toDateString(data.elSignedSharedDate),
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const dateFields = [
    { key: "rfqDate"            as const, label: "RFQ Date",        raw: data.rfqDate },
    { key: "quoteSentDate"      as const, label: "Quote Shared",     raw: data.quoteSentDate },
    { key: "elRequestedDate"    as const, label: "EL Requested",     raw: data.elRequestedDate },
    { key: "elDraftSharedDate"  as const, label: "EL Draft Shared",  raw: data.elDraftSharedDate },
    { key: "elSignedSharedDate" as const, label: "EL Signed Shared", raw: data.elSignedSharedDate },
  ]

  function enter() {
    setForm({
      rfqDate:           toDateString(data.rfqDate),
      quoteSentDate:     toDateString(data.quoteSentDate),
      elRequestedDate:   toDateString(data.elRequestedDate),
      elDraftSharedDate: toDateString(data.elDraftSharedDate),
      elSignedSharedDate:toDateString(data.elSignedSharedDate),
    })
    setError("")
    setEditing(true)
  }

  async function save() {
    setSaving(true)
    const err = await onSave(form)
    setSaving(false)
    if (err) { setError(err); return }
    setEditing(false)
    setError("")
  }

  if (editing) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-medium text-gray-400">Dates</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={save} disabled={saving}
              className="px-3 py-1 bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
              {saving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => setEditing(false)}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={13} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {dateFields.map(({ key, label }) => (
            <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-400 mb-2">{label}</p>
              <input type="date" value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full text-xs border-b border-gray-200 focus:border-gray-600 outline-none py-0.5 bg-transparent" />
            </div>
          ))}
        </div>
        {error && <p className="text-xs text-red-600 mt-2">{error}</p>}
      </div>
    )
  }

  return (
    <div className="group relative">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {dateFields.map(({ key, label, raw }) => (
          <div key={key} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
            <p className="text-sm font-medium text-gray-900">{raw ? formatDate(raw) : "—"}</p>
          </div>
        ))}
      </div>
      <button type="button" onClick={enter}
        className="absolute -top-1 right-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
        <Pencil size={11} />Edit dates
      </button>
    </div>
  )
}
