"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X, Pencil, Check } from "lucide-react"
import {
  cn, formatDate,
  QUOTE_STATUSES, EL_STATUSES, PRODUCTION_STATUSES, STATUS_LABELS,
  todayISO, toDateString,
} from "@/lib/utils"
import { StatusBadge } from "@/components/opportunities/status-badge"
import { QuoteSection } from "@/components/opportunities/quote-section"
import { ProductionSection } from "@/components/opportunities/production-section"
import { LogSection, type LogEntry } from "@/components/opportunities/log-section"
import { Button } from "@/components/ui/button"

const ALL_EL_STATUSES = [...EL_STATUSES, "EL_FULLY_SIGNED"]

const STATUS_DATE_REQUIRED: Record<string, { field: string; label: string }> = {
  RFQ_RECEIVED:        { field: "rfqDate",           label: "RFQ Date" },
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
  elCountersignedDate: string | null
  advancePaymentDate: string | null; fatDate: string | null
  fatPassedDate: string | null; satApplicable: boolean
  satDate: string | null; satPassedDate: string | null; deliveredDate: string | null
  description: string | null; createdAt: string; updatedAt: string
  createdBy: { id: string; name: string }
  comments: LogEntry[]; documents: ModalDoc[]
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export function OpportunityModal({
  opportunityId, onClose, currentUserId, isAdmin,
}: {
  opportunityId: string | null
  onClose: () => void
  currentUserId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [data, setData] = useState<OpportunityFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState("")
  const [refreshKey, setRefreshKey] = useState(0)

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    router.refresh()
  }, [router])

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

              />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── View mode ────────────────────────────────────────────────────────────────

function ViewMode({ data, currentUserId, isAdmin, onRefresh, onSilentRefresh }: {
  data: OpportunityFull
  currentUserId: string
  isAdmin: boolean
  onRefresh: () => void
  onSilentRefresh: () => void
}) {
  const isEL = ALL_EL_STATUSES.includes(data.status)
  const isProduction = (PRODUCTION_STATUSES as readonly string[]).includes(data.status)
  const canAcceptQuote = data.status === "QUOTE_SENT"

  // Quote accepted panel
  const [acceptingQuote, setAcceptingQuote] = useState(false)
  const [elDate, setElDate] = useState(todayISO())
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState("")

  // Counter-sign panel
  const [counterSigning, setCounterSigning] = useState(false)
  const [counterSignDate, setCounterSignDate] = useState(todayISO())
  const [counterSigning2, setCounterSigning2] = useState(false)
  const [counterSignError, setCounterSignError] = useState("")

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
        body: JSON.stringify({ status: "PENDING_ADVANCE_PAYMENT", elCountersignedDate: counterSignDate }),
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
                className="text-xs border border-green-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-400 bg-white" />
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
        <div className="mb-5 flex flex-wrap items-end gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div>
            <p className="text-xs font-semibold text-green-800 mb-1">EL Countersigned — Transition to Production</p>
            <p className="text-xs text-green-700 mb-3">Records the countersigned date and moves the opportunity to Production.</p>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-green-700">Countersigned date</span>
              <input type="date" value={counterSignDate} onChange={(e) => setCounterSignDate(e.target.value)}
                className="text-xs border border-green-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-green-400 bg-white" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleCounterSigned} disabled={counterSigning2 || !counterSignDate}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
              {counterSigning2 ? "Saving…" : "Confirm"}
            </button>
            <button type="button" onClick={() => { setCounterSigning(false); setCounterSignError("") }}
              className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800">
              Cancel
            </button>
          </div>
          {counterSignError && <p className="w-full text-xs text-red-600">{counterSignError}</p>}
        </div>
      )}

      {/* Info section */}
      <div className="flex flex-col gap-3 mb-5">
        <HoverEditField label="Customer" value={data.customer} required
          onSave={(v) => patch({ customer: v })} />
        <HoverEditField label="Product / Service" value={data.product}
          onSave={(v) => patch({ product: v })} />
        <HoverEditDates data={data} onSave={patch} onRefresh={onRefresh} />
        <HoverEditField label="Details" value={data.description} multiline
          onSave={(v) => patch({ description: v })} />
      </div>

      {/* Documents, Production, Log */}
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
  const [form, setForm] = useState({ status: data.status, internalId: data.internalId ?? "", reference: data.reference ?? "" })
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  const isEL = ALL_EL_STATUSES.includes(form.status)
  const isProd = (PRODUCTION_STATUSES as readonly string[]).includes(form.status)
  const isQuote = (QUOTE_STATUSES as readonly string[]).includes(form.status)
  const statusOptions = isProd
    ? ["PENDING_ADVANCE_PAYMENT", "IN_PRODUCTION", "DELIVERED"]
    : [...EL_STATUSES, "EL_FULLY_SIGNED"]

  function enter() {
    setForm({ status: data.status, internalId: data.internalId ?? "", reference: data.reference ?? "" })
    setError("")
    setEditing(true)
  }

  async function save() {
    const payload: Record<string, unknown> = { ...form }
    const req = STATUS_DATE_REQUIRED[form.status]
    if (req) {
      const existing = data[req.field as keyof OpportunityFull] as string | null
      if (!existing) {
        setError(`"${STATUS_LABELS[form.status]}" requires the "${req.label}" date to be set first.`)
        return
      }
    }
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
          {isQuote || isEL ? (
            <StatusBadge status={form.status} />
          ) : (
            <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              className="px-3 py-1 border border-gray-300 rounded-full text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-gray-400">
              {statusOptions.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
          )}
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
          <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="group flex flex-wrap items-center gap-2 mb-5 cursor-pointer" onClick={enter}>
      <StatusBadge status={data.status} />
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

function HoverEditDates({ data, onSave, onRefresh }: {
  data: OpportunityFull
  onSave: (payload: Record<string, unknown>) => Promise<string | null>
  onRefresh: () => void
}) {
  const isEL = ALL_EL_STATUSES.includes(data.status)
  const isQuote = (QUOTE_STATUSES as readonly string[]).includes(data.status)

  const isProduction = (PRODUCTION_STATUSES as readonly string[]).includes(data.status)

  const allFields = [
    { key: "rfqDate"              as const, label: "RFQ Date",           raw: data.rfqDate },
    { key: "quoteSentDate"        as const, label: "Quote Shared",        raw: data.quoteSentDate },
    { key: "elRequestedDate"      as const, label: "EL Requested",        raw: data.elRequestedDate },
    { key: "elDraftSharedDate"    as const, label: "EL Draft Shared",     raw: data.elDraftSharedDate },
    { key: "elSignedSharedDate"   as const, label: "EL Signed Shared",    raw: data.elSignedSharedDate },
    { key: "elCountersignedDate"  as const, label: "EL Countersigned",    raw: data.elCountersignedDate },
  ]

  const dateFields = isQuote ? allFields.slice(0, 2) : allFields

  const initForm = () => ({
    rfqDate:              toDateString(data.rfqDate),
    quoteSentDate:        toDateString(data.quoteSentDate),
    elRequestedDate:      toDateString(data.elRequestedDate),
    elDraftSharedDate:    toDateString(data.elDraftSharedDate),
    elSignedSharedDate:   toDateString(data.elSignedSharedDate),
    elCountersignedDate:  toDateString(data.elCountersignedDate),
  })

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(initForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [shareDate, setShareDate] = useState(todayISO())
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState("")

  const [elDraftDate, setElDraftDate] = useState(todayISO())
  const [elDraftSharing, setElDraftSharing] = useState(false)
  const [elDraftShareError, setElDraftShareError] = useState("")

  const [elSignedDate, setElSignedDate] = useState(todayISO())
  const [elSignedSharing, setElSignedSharing] = useState(false)
  const [elSignedShareError, setElSignedShareError] = useState("")

  const [revertTarget, setRevertTarget] = useState<{ status: string; label: string; clearField: string } | null>(null)
  const [reverting, setReverting] = useState(false)
  const [revertError, setRevertError] = useState("")

  const quoteDocCount = data.documents.filter((d) => d.type === "QUOTE").length
  const elDocCount = data.documents.filter((d) => d.type === "EL").length

  function enter() { setForm(initForm()); setError(""); setEditing(true) }

  async function save() {
    setSaving(true)
    const err = await onSave(form)
    setSaving(false)
    if (err) { setError(err); return }
    setEditing(false)
    setError("")
  }

  async function handleShareQuote() {
    setSharing(true)
    setShareError("")
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quoteSentDate: shareDate, status: "QUOTE_SENT" }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setShareError(d.error ?? "Failed to save.")
      } else {
        onRefresh()
      }
    } catch {
      setShareError("Network error. Please try again.")
    } finally {
      setSharing(false)
    }
  }

  async function handleShareELDraft() {
    setElDraftSharing(true)
    setElDraftShareError("")
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elDraftSharedDate: elDraftDate, status: "EL_DRAFT_SHARED" }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setElDraftShareError(d.error ?? "Failed to save.")
      } else {
        onRefresh()
      }
    } catch {
      setElDraftShareError("Network error. Please try again.")
    } finally {
      setElDraftSharing(false)
    }
  }

  async function handleRevert() {
    if (!revertTarget) return
    setReverting(true)
    setRevertError("")
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: revertTarget.status, [revertTarget.clearField]: null }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setRevertError(d.error ?? "Failed to revert.")
      } else {
        setRevertTarget(null)
        onRefresh()
      }
    } catch {
      setRevertError("Network error. Please try again.")
    } finally {
      setReverting(false)
    }
  }

  async function handleShareSignedEL() {
    setElSignedSharing(true)
    setElSignedShareError("")
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ elSignedSharedDate: elSignedDate, status: "EL_SIGNED_SHARED" }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        setElSignedShareError(d.error ?? "Failed to save.")
      } else {
        onRefresh()
      }
    } catch {
      setElSignedShareError("Network error. Please try again.")
    } finally {
      setElSignedSharing(false)
    }
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
        <div className={cn("grid gap-3", isEL || isProduction ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6" : "grid-cols-2")}>
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
    <div className="group/dates">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs font-medium text-gray-400">Dates</p>
        <button type="button" onClick={enter}
          className="flex items-center gap-1 opacity-0 group-hover/dates:opacity-100 px-2 py-1 text-xs font-medium text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all">
          <Pencil size={11} />Edit dates
        </button>
      </div>

      {isQuote ? (
        <div className="grid gap-3 grid-cols-2">
          {/* RFQ Date */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs font-medium text-gray-400 mb-1">RFQ Date</p>
            <p className="text-sm font-medium text-gray-900">{data.rfqDate ? formatDate(data.rfqDate) : "—"}</p>
          </div>

          {/* Quote Shared — action card or done card */}
          {data.quoteSentDate ? (
            <div className="group/card border border-green-200 bg-green-50 rounded-xl p-4 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-medium text-green-700">Quote Shared</p>
                <Check size={12} className="text-green-500 flex-shrink-0" />
              </div>
              <p className="text-sm font-semibold text-green-800">{formatDate(data.quoteSentDate)}</p>
              <button type="button"
                onClick={() => setRevertTarget({ status: "RFQ_RECEIVED", label: "RFQ Received", clearField: "quoteSentDate" })}
                className="opacity-0 group-hover/card:opacity-100 w-full px-2 py-1 bg-white hover:bg-red-50 text-red-500 border border-red-200 text-xs font-medium rounded-lg transition-all">
                Revert
              </button>
            </div>
          ) : (
            <div className="border border-gray-200 bg-white rounded-xl p-4 flex flex-col gap-2">
              <p className="text-xs font-medium text-gray-400">Quote Shared</p>
              <input type="date" value={shareDate} onChange={(e) => setShareDate(e.target.value)}
                className="w-full text-xs border-b border-gray-200 focus:border-gray-600 outline-none py-0.5 bg-transparent" />
              {quoteDocCount === 0 && (
                <p className="text-xs text-red-500">No quote document attached</p>
              )}
              <button type="button" onClick={handleShareQuote} disabled={sharing || !shareDate}
                className="mt-1 w-full px-3 py-1.5 bg-[#006fff] hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
                {sharing ? "Saving…" : "Share Quote"}
              </button>
              {shareError && <p className="text-xs text-red-600">{shareError}</p>}
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          {/* RFQ Date — no revert, it's the start */}
          <ELDoneCard label="RFQ Date" value={data.rfqDate} />
          {/* Quote Shared */}
          <ELDoneCard label="Quote Shared" value={data.quoteSentDate}
            onRevert={data.quoteSentDate ? () => setRevertTarget({ status: "RFQ_RECEIVED", label: "RFQ Received", clearField: "quoteSentDate" }) : undefined} />
          {/* EL Requested */}
          <ELDoneCard label="EL Requested" value={data.elRequestedDate}
            onRevert={data.elRequestedDate ? () => setRevertTarget({ status: "QUOTE_SENT", label: "Quote Sent", clearField: "elRequestedDate" }) : undefined} />

          {/* EL Draft Shared */}
          {data.elDraftSharedDate ? (
            <ELDoneCard label="EL Draft Shared" value={data.elDraftSharedDate}
              onRevert={() => setRevertTarget({ status: "EL_REQUEST_RECEIVED", label: "EL Requested", clearField: "elDraftSharedDate" })} />
          ) : data.status === "EL_REQUEST_RECEIVED" ? (
            <div className="border border-gray-200 bg-white rounded-xl p-4 flex flex-col gap-2">
              <p className="text-xs font-medium text-gray-400">EL Draft Shared</p>
              <input type="date" value={elDraftDate} onChange={(e) => setElDraftDate(e.target.value)}
                className="w-full text-xs border-b border-gray-200 focus:border-gray-600 outline-none py-0.5 bg-transparent" />
              {elDocCount === 0 && (
                <p className="text-xs text-red-500">No EL document attached</p>
              )}
              <button type="button" onClick={handleShareELDraft} disabled={elDraftSharing || !elDraftDate}
                className="mt-1 w-full px-3 py-1.5 bg-[#006fff] hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
                {elDraftSharing ? "Saving…" : "Share EL Draft"}
              </button>
              {elDraftShareError && <p className="text-xs text-red-600">{elDraftShareError}</p>}
            </div>
          ) : (
            <ELLockedCard label="EL Draft Shared" />
          )}

          {/* EL Signed Shared */}
          {data.elSignedSharedDate ? (
            <ELDoneCard label="EL Signed Shared" value={data.elSignedSharedDate}
              onRevert={() => setRevertTarget({ status: "EL_DRAFT_SHARED", label: "EL Draft Shared", clearField: "elSignedSharedDate" })} />
          ) : data.status === "EL_DRAFT_SHARED" ? (
            <div className="border border-gray-200 bg-white rounded-xl p-4 flex flex-col gap-2">
              <p className="text-xs font-medium text-gray-400">EL Signed Shared</p>
              <input type="date" value={elSignedDate} onChange={(e) => setElSignedDate(e.target.value)}
                className="w-full text-xs border-b border-gray-200 focus:border-gray-600 outline-none py-0.5 bg-transparent" />
              {elDocCount === 0 && (
                <p className="text-xs text-red-500">No EL document attached</p>
              )}
              <button type="button" onClick={handleShareSignedEL} disabled={elSignedSharing || !elSignedDate}
                className="mt-1 w-full px-3 py-1.5 bg-[#006fff] hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
                {elSignedSharing ? "Saving…" : "Share Signed EL"}
              </button>
              {elSignedShareError && <p className="text-xs text-red-600">{elSignedShareError}</p>}
            </div>
          ) : (
            <ELLockedCard label="EL Signed Shared" />
          )}

          {/* EL Countersigned */}
          {data.elCountersignedDate ? (
            <ELDoneCard label="EL Countersigned" value={data.elCountersignedDate}
              onRevert={() => setRevertTarget({ status: "EL_SIGNED_SHARED", label: "EL Signed Shared", clearField: "elCountersignedDate" })} />
          ) : (
            <ELLockedCard label="EL Countersigned" />
          )}
        </div>
      )}

      {revertTarget && (
        <div className="mt-3 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs font-medium text-red-800 mb-3">
            Revert status to <span className="font-semibold">"{revertTarget.label}"</span>? The milestone date will be cleared.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleRevert} disabled={reverting}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
              {reverting ? "Reverting…" : "Confirm Revert"}
            </button>
            <button type="button" onClick={() => { setRevertTarget(null); setRevertError("") }}
              className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
              Cancel
            </button>
          </div>
          {revertError && <p className="mt-2 text-xs text-red-600">{revertError}</p>}
        </div>
      )}
    </div>
  )
}

// ─── EL date card helpers ─────────────────────────────────────────────────────

function ELDoneCard({ label, value, onRevert }: { label: string; value: string | null; onRevert?: () => void }) {
  return value ? (
    <div className={cn("border border-green-200 bg-green-50 rounded-xl p-4 flex flex-col gap-2", onRevert && "group/card")}>
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-medium text-green-700">{label}</p>
        <Check size={12} className="text-green-500 flex-shrink-0" />
      </div>
      <p className="text-sm font-semibold text-green-800">{formatDate(value)}</p>
      {onRevert && (
        <button type="button" onClick={onRevert}
          className="opacity-0 group-hover/card:opacity-100 w-full px-2 py-1 bg-white hover:bg-red-50 text-red-500 border border-red-200 text-xs font-medium rounded-lg transition-all">
          Revert
        </button>
      )}
    </div>
  ) : (
    <div className="border border-gray-100 bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-300">{label}</p>
      <p className="text-sm font-medium text-gray-300 mt-1">—</p>
    </div>
  )
}

function ELLockedCard({ label }: { label: string }) {
  return (
    <div className="border border-gray-100 bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-300">{label}</p>
      <p className="text-sm font-medium text-gray-300 mt-1">—</p>
    </div>
  )
}
