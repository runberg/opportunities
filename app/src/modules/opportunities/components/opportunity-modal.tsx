"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X } from "lucide-react"
import {
  cn,
  QUOTE_STATUSES, EL_STATUSES, PRODUCTION_STATUSES, STATUS_LABELS,
  todayISO, toDateString,
} from "@/shared/lib/utils"
import { StatusBadge } from "@/modules/opportunities/components/status-badge"
import { QuoteSection } from "@/modules/opportunities/components/quote-section"
import { ProductionSection } from "@/modules/opportunities/components/production-section"
import { LogSection, type LogEntry } from "@/modules/opportunities/components/log-section"
import { Button } from "@/shared/components/ui/button"

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
  readonly opportunityId: string | null
  readonly onClose: () => void
  readonly currentUserId: string
  readonly isAdmin: boolean
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
      .then((r) => {
        if (!r.ok) { throw new Error("Failed to load opportunity") }
        return r.json()
      })
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

  let sectionLabel: string
  if (data && (PRODUCTION_STATUSES as readonly string[]).includes(data.status)) {
    sectionLabel = "Production"
  } else if (data && (EL_STATUSES as readonly string[]).includes(data.status)) {
    sectionLabel = "Engagement Letter"
  } else {
    sectionLabel = "Quote"
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-[4vh]">
        <button type="button" aria-label="Close" className="fixed inset-0 bg-black/40 cursor-default" onClick={onClose} />
        <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl mb-8">
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-400 dark:text-gray-500 font-medium tracking-wide uppercase">
              {sectionLabel}
            </span>
            <button type="button" onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
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

// ─── Form helpers ─────────────────────────────────────────────────────────────

const inputCls = "w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#006fff] focus:bg-white dark:focus:bg-gray-600 transition-colors"
const textareaCls = "w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[#006fff] focus:bg-white dark:focus:bg-gray-600 resize-none transition-colors"
const dateInputCls = "w-full rounded-md border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#006fff] focus:bg-white dark:focus:bg-gray-600 transition-colors"

function makeForm(data: OpportunityFull) {
  return {
    title: data.title,
    customer: data.customer,
    product: data.product ?? "",
    description: data.description ?? "",
    internalId: data.internalId ?? "",
    reference: data.reference ?? "",
    status: data.status,
    rfqDate: toDateString(data.rfqDate),
    quoteSentDate: toDateString(data.quoteSentDate),
    elRequestedDate: toDateString(data.elRequestedDate),
    elDraftSharedDate: toDateString(data.elDraftSharedDate),
    elSignedSharedDate: toDateString(data.elSignedSharedDate),
    elCountersignedDate: toDateString(data.elCountersignedDate),
  }
}
type OppForm = ReturnType<typeof makeForm>

function FormField({ label, children, required = false }: {
  readonly label: string; readonly children: React.ReactNode; readonly required?: boolean
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs font-medium text-gray-500">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </p>
      {children}
    </div>
  )
}

// ─── View mode ────────────────────────────────────────────────────────────────

function ViewMode({ data, currentUserId, isAdmin, onRefresh, onSilentRefresh }: {
  readonly data: OpportunityFull
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onRefresh: () => void
  readonly onSilentRefresh: () => void
}) {
  const isEL = (EL_STATUSES as readonly string[]).includes(data.status)
  const isProduction = (PRODUCTION_STATUSES as readonly string[]).includes(data.status)
  const canAcceptQuote = data.status === "QUOTE_SENT"

  // Unified form state
  const [form, setForm] = useState<OppForm>(() => makeForm(data))
  const [saving, setSaving] = useState(false)
  const [applyError, setApplyError] = useState("")

  // Reset form when server data refreshes
  useEffect(() => { setForm(makeForm(data)) }, [data])

  const isDirty =
    form.title !== data.title ||
    form.customer !== data.customer ||
    form.product !== (data.product ?? "") ||
    form.description !== (data.description ?? "") ||
    form.internalId !== (data.internalId ?? "") ||
    form.reference !== (data.reference ?? "") ||
    form.status !== data.status ||
    form.rfqDate !== toDateString(data.rfqDate) ||
    form.quoteSentDate !== toDateString(data.quoteSentDate) ||
    form.elRequestedDate !== toDateString(data.elRequestedDate) ||
    form.elDraftSharedDate !== toDateString(data.elDraftSharedDate) ||
    form.elSignedSharedDate !== toDateString(data.elSignedSharedDate) ||
    form.elCountersignedDate !== toDateString(data.elCountersignedDate)

  function set<K extends keyof OppForm>(field: K, value: OppForm[K]) {
    setForm(f => ({ ...f, [field]: value }))
  }

  function discard() { setForm(makeForm(data)); setApplyError("") }

  async function directPatch(payload: Record<string, unknown>): Promise<string | null> {
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

  function validateStatusChange(): string | null {
    if (form.status === data.status) return null
    const req = STATUS_DATE_REQUIRED[form.status]
    if (!req) return null
    const existing = data[req.field as keyof OpportunityFull] as string | null
    const formVal = form[req.field as keyof OppForm]
    if (!existing && !formVal) {
      return `"${STATUS_LABELS[form.status]}" requires the "${req.label}" date to be set first.`
    }
    return null
  }

  function buildPayload(): Record<string, unknown> {
    const p: Record<string, unknown> = {}
    if (form.title !== data.title) p.title = form.title
    if (form.customer !== data.customer) p.customer = form.customer
    if (form.product !== (data.product ?? "")) p.product = form.product
    if (form.description !== (data.description ?? "")) p.description = form.description
    if (form.internalId !== (data.internalId ?? "")) p.internalId = form.internalId
    if (form.reference !== (data.reference ?? "")) p.reference = form.reference
    if (form.status !== data.status) p.status = form.status
    if (form.rfqDate !== toDateString(data.rfqDate)) p.rfqDate = form.rfqDate || null
    if (form.quoteSentDate !== toDateString(data.quoteSentDate)) p.quoteSentDate = form.quoteSentDate || null
    if (form.elRequestedDate !== toDateString(data.elRequestedDate)) p.elRequestedDate = form.elRequestedDate || null
    if (form.elDraftSharedDate !== toDateString(data.elDraftSharedDate)) p.elDraftSharedDate = form.elDraftSharedDate || null
    if (form.elSignedSharedDate !== toDateString(data.elSignedSharedDate)) p.elSignedSharedDate = form.elSignedSharedDate || null
    if (form.elCountersignedDate !== toDateString(data.elCountersignedDate)) p.elCountersignedDate = form.elCountersignedDate || null
    return p
  }

  async function applyChanges() {
    if (!form.title.trim() || !form.customer.trim()) {
      setApplyError("Title and customer are required.")
      return
    }
    const statusError = validateStatusChange()
    if (statusError) { setApplyError(statusError); return }
    setSaving(true)
    setApplyError("")
    const err = await directPatch(buildPayload())
    setSaving(false)
    if (err) setApplyError(err)
  }

  // Quote accepted panel
  const [acceptingQuote, setAcceptingQuote] = useState(false)
  const [elDate, setElDate] = useState(todayISO())
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState("")

  // Counter-sign panel
  const [counterSigning, setCounterSigning] = useState(false)
  const [counterSignDate, setCounterSignDate] = useState(todayISO())
  const [counterSignSaving, setCounterSignSaving] = useState(false)
  const [counterSignError, setCounterSignError] = useState("")

  async function handleAcceptQuote() {
    setAccepting(true)
    setAcceptError("")
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "EL_REQUEST_RECEIVED", elRequestedDate: elDate }),
      })
      if (res.ok) {
        setAcceptingQuote(false)
        onRefresh()
      } else {
        const d = await res.json().catch(() => ({}))
        setAcceptError(d.error ?? "Failed to save. Please try again.")
      }
    } catch {
      setAcceptError("Network error. Please try again.")
    } finally {
      setAccepting(false)
    }
  }

  async function handleCounterSigned() {
    setCounterSignSaving(true)
    setCounterSignError("")
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PENDING_ADVANCE_PAYMENT", elCountersignedDate: counterSignDate }),
      })
      if (res.ok) {
        setCounterSigning(false)
        onRefresh()
      } else {
        const d = await res.json().catch(() => ({}))
        setCounterSignError(d.error ?? "Failed to save. Please try again.")
      }
    } catch {
      setCounterSignError("Network error. Please try again.")
    } finally {
      setCounterSignSaving(false)
    }
  }

  // Status options for production (only stage where status is a free dropdown)
  const prodStatusOptions = ["PENDING_ADVANCE_PAYMENT", "IN_PRODUCTION", "DELIVERED"]

  return (
    <div>
      {/* Title */}
      <div className="flex items-start justify-between gap-4 mb-3">
        <textarea
          rows={1}
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.target as HTMLTextAreaElement).blur() } }}
          className="flex-1 min-w-0 text-2xl font-semibold text-gray-900 dark:text-gray-100 appearance-none bg-white dark:bg-gray-800 focus:bg-gray-50 dark:focus:bg-gray-700 border-b border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:outline-none focus:border-[#006fff] leading-tight transition-colors px-1 py-1.5 resize-none overflow-hidden"
        />
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

      {/* Meta row: status + ID + Ref */}
      <div className="flex flex-wrap items-center gap-2 mb-5">
        {isProduction ? (
          <select value={form.status} onChange={(e) => set("status", e.target.value)}
            className="px-3 py-1 border border-gray-200 dark:border-gray-600 rounded-full text-xs font-medium bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-[#006fff] transition-colors">
            {prodStatusOptions.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        ) : (
          <StatusBadge status={data.status} />
        )}
        <label className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 focus-within:border-[#006fff] transition-colors cursor-text">
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">ID</span>
          <input value={form.internalId} onChange={(e) => set("internalId", e.target.value)}
            maxLength={10} placeholder="—" className="text-xs font-medium text-gray-900 dark:text-gray-100 bg-transparent outline-none w-14" />
        </label>
        <label className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-200 dark:border-gray-600 rounded-full bg-gray-50 dark:bg-gray-700 focus-within:border-[#006fff] transition-colors cursor-text">
          <span className="text-xs text-gray-400 dark:text-gray-500 shrink-0">Ref.</span>
          <input value={form.reference} onChange={(e) => set("reference", e.target.value)}
            placeholder="—" className="text-xs font-medium text-gray-900 dark:text-gray-100 bg-transparent outline-none w-24" />
        </label>
      </div>

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
            <button type="button" onClick={handleCounterSigned} disabled={counterSignSaving || !counterSignDate}
              className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
              {counterSignSaving ? "Saving…" : "Confirm"}
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
      <div className="flex flex-col gap-4 mb-4">
        <FormField label="Customer" required>
          <input value={form.customer} onChange={(e) => set("customer", e.target.value)}
            placeholder="Customer name" className={inputCls} />
        </FormField>
        <FormField label="Product / Service">
          <input value={form.product} onChange={(e) => set("product", e.target.value)}
            placeholder="Requested product or service" className={inputCls} />
        </FormField>
        <DateSection data={data} form={form} setForm={setForm} onRefresh={onRefresh} onDirectPatch={directPatch} />
        <FormField label="Details">
          <textarea value={form.description} onChange={(e) => set("description", e.target.value)}
            rows={3} placeholder="Additional context, requirements, or background…" className={textareaCls} />
        </FormField>
      </div>

      {/* Apply Changes bar */}
      {isDirty && (
        <div className="flex flex-wrap items-center gap-3 mb-5 px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl">
          <span className="text-xs text-blue-700 flex-1 min-w-0">Unsaved changes</span>
          <button type="button" onClick={discard}
            className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 font-medium transition-colors">
            Discard
          </button>
          <button type="button" onClick={applyChanges} disabled={saving}
            className="px-4 py-1.5 bg-[#006fff] hover:bg-blue-700 text-white text-xs font-semibold rounded-lg disabled:opacity-50 transition-colors">
            {saving ? "Saving…" : "Apply Changes"}
          </button>
          {applyError && <p className="w-full text-xs text-red-600">{applyError}</p>}
        </div>
      )}

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

// ─── Date section ─────────────────────────────────────────────────────────────

type RevertTarget = { status: string; label: string; clearField: string }
type SetDate = (key: keyof OppForm, value: string) => void

function ShareActionCard({ label, date, onDateChange, docCount, docLabel, saving, onShare, error, buttonLabel }: {
  readonly label: string; readonly date: string
  readonly onDateChange: (v: string) => void
  readonly docCount: number; readonly docLabel: string
  readonly saving: boolean; readonly onShare: () => void
  readonly error: string; readonly buttonLabel: string
}) {
  return (
    <div className="border border-gray-200 bg-white rounded-xl p-4 flex flex-col gap-2">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} className={dateInputCls} />
      {docCount === 0 && <p className="text-xs text-red-500">No {docLabel} attached</p>}
      <button type="button" onClick={onShare} disabled={saving || !date}
        className="mt-1 w-full px-3 py-1.5 bg-[#006fff] hover:bg-blue-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
        {saving ? "Saving…" : buttonLabel}
      </button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}

function QuoteDatePanel({ data, form, setDate, setRevertTarget, onDirectPatch, onRefresh }: {
  readonly data: OpportunityFull; readonly form: OppForm
  readonly setDate: SetDate; readonly setRevertTarget: (t: RevertTarget) => void
  readonly onDirectPatch: (p: Record<string, unknown>) => Promise<string | null>; readonly onRefresh: () => void
}) {
  const [shareDate, setShareDate] = useState(todayISO())
  const [sharing, setSharing] = useState(false)
  const [shareError, setShareError] = useState("")
  const quoteDocCount = data.documents.filter((d) => d.type === "QUOTE").length

  async function handleShareQuote() {
    setSharing(true); setShareError("")
    const err = await onDirectPatch({ quoteSentDate: shareDate, status: "QUOTE_SENT" })
    setSharing(false)
    if (err) setShareError(err); else onRefresh()
  }

  return (
    <div className="grid gap-3 grid-cols-2">
      <DateCard label="RFQ Date" formValue={form.rfqDate} onChange={(v) => setDate("rfqDate", v)} />
      {data.quoteSentDate ? (
        <DateCard label="Quote Shared" formValue={form.quoteSentDate}
          onChange={(v) => setDate("quoteSentDate", v)}
          onRevert={() => setRevertTarget({ status: "RFQ_RECEIVED", label: "RFQ Received", clearField: "quoteSentDate" })} />
      ) : (
        <ShareActionCard label="Quote Shared" date={shareDate} onDateChange={setShareDate}
          docCount={quoteDocCount} docLabel="quote document"
          saving={sharing} onShare={handleShareQuote} error={shareError} buttonLabel="Share Quote" />
      )}
    </div>
  )
}

function ELDatePanel({ data, form, setDate, setRevertTarget, onDirectPatch, onRefresh }: {
  readonly data: OpportunityFull; readonly form: OppForm
  readonly setDate: SetDate; readonly setRevertTarget: (t: RevertTarget) => void
  readonly onDirectPatch: (p: Record<string, unknown>) => Promise<string | null>; readonly onRefresh: () => void
}) {
  const [elDraftDate, setElDraftDate] = useState(todayISO())
  const [elDraftSharing, setElDraftSharing] = useState(false)
  const [elDraftShareError, setElDraftShareError] = useState("")
  const [elSignedDate, setElSignedDate] = useState(todayISO())
  const [elSignedSharing, setElSignedSharing] = useState(false)
  const [elSignedShareError, setElSignedShareError] = useState("")
  const elDocCount = data.documents.filter((d) => d.type === "EL").length

  async function handleShareELDraft() {
    setElDraftSharing(true); setElDraftShareError("")
    const err = await onDirectPatch({ elDraftSharedDate: elDraftDate, status: "EL_DRAFT_SHARED" })
    setElDraftSharing(false)
    if (err) setElDraftShareError(err); else onRefresh()
  }

  async function handleShareSignedEL() {
    setElSignedSharing(true); setElSignedShareError("")
    const err = await onDirectPatch({ elSignedSharedDate: elSignedDate, status: "EL_SIGNED_SHARED" })
    setElSignedSharing(false)
    if (err) setElSignedShareError(err); else onRefresh()
  }

  let elDraftCardNode: React.ReactNode
  if (data.elDraftSharedDate) {
    elDraftCardNode = (
      <DateCard label="EL Draft Shared" formValue={form.elDraftSharedDate}
        onChange={(v) => setDate("elDraftSharedDate", v)}
        onRevert={() => setRevertTarget({ status: "EL_REQUEST_RECEIVED", label: "EL Requested", clearField: "elDraftSharedDate" })} />
    )
  } else if (data.status === "EL_REQUEST_RECEIVED") {
    elDraftCardNode = (
      <ShareActionCard label="EL Draft Shared" date={elDraftDate} onDateChange={setElDraftDate}
        docCount={elDocCount} docLabel="EL document"
        saving={elDraftSharing} onShare={handleShareELDraft} error={elDraftShareError} buttonLabel="Share EL Draft" />
    )
  } else {
    elDraftCardNode = <LockedDateCard label="EL Draft Shared" />
  }

  let elSignedCardNode: React.ReactNode
  if (data.elSignedSharedDate) {
    elSignedCardNode = (
      <DateCard label="EL Signed Shared" formValue={form.elSignedSharedDate}
        onChange={(v) => setDate("elSignedSharedDate", v)}
        onRevert={() => setRevertTarget({ status: "EL_DRAFT_SHARED", label: "EL Draft Shared", clearField: "elSignedSharedDate" })} />
    )
  } else if (data.status === "EL_DRAFT_SHARED") {
    elSignedCardNode = (
      <ShareActionCard label="EL Signed Shared" date={elSignedDate} onDateChange={setElSignedDate}
        docCount={elDocCount} docLabel="EL document"
        saving={elSignedSharing} onShare={handleShareSignedEL} error={elSignedShareError} buttonLabel="Share Signed EL" />
    )
  } else {
    elSignedCardNode = <LockedDateCard label="EL Signed Shared" />
  }

  return (
    <div className="grid gap-3 grid-cols-5">
      <DateCard label="RFQ Date" formValue={form.rfqDate} onChange={(v) => setDate("rfqDate", v)} />
      {data.quoteSentDate ? (
        <DateCard label="Quote Shared" formValue={form.quoteSentDate}
          onChange={(v) => setDate("quoteSentDate", v)}
          onRevert={() => setRevertTarget({ status: "RFQ_RECEIVED", label: "RFQ Received", clearField: "quoteSentDate" })} />
      ) : (
        <LockedDateCard label="Quote Shared" />
      )}
      {data.elRequestedDate ? (
        <DateCard label="EL Requested" formValue={form.elRequestedDate}
          onChange={(v) => setDate("elRequestedDate", v)}
          onRevert={() => setRevertTarget({ status: "QUOTE_SENT", label: "Quote Sent", clearField: "elRequestedDate" })} />
      ) : (
        <LockedDateCard label="EL Requested" />
      )}
      {elDraftCardNode}
      {elSignedCardNode}
    </div>
  )
}

function DateSection({ data, form, setForm, onRefresh, onDirectPatch }: {
  readonly data: OpportunityFull
  readonly form: OppForm
  readonly setForm: React.Dispatch<React.SetStateAction<OppForm>>
  readonly onRefresh: () => void
  readonly onDirectPatch: (payload: Record<string, unknown>) => Promise<string | null>
}) {
  const isEL = (EL_STATUSES as readonly string[]).includes(data.status)
  const isQuote = (QUOTE_STATUSES as readonly string[]).includes(data.status)

  function setDate(key: keyof OppForm, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const [revertTarget, setRevertTarget] = useState<RevertTarget | null>(null)
  const [reverting, setReverting] = useState(false)
  const [revertError, setRevertError] = useState("")

  async function handleRevert() {
    if (!revertTarget) return
    setReverting(true); setRevertError("")
    const err = await onDirectPatch({ status: revertTarget.status, [revertTarget.clearField]: null })
    setReverting(false)
    if (err) setRevertError(err); else { setRevertTarget(null); onRefresh() }
  }

  if (!isQuote && !isEL) return null

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 mb-2">Dates</p>
      {isQuote ? (
        <QuoteDatePanel data={data} form={form} setDate={setDate} setRevertTarget={setRevertTarget}
          onDirectPatch={onDirectPatch} onRefresh={onRefresh} />
      ) : (
        <ELDatePanel data={data} form={form} setDate={setDate} setRevertTarget={setRevertTarget}
          onDirectPatch={onDirectPatch} onRefresh={onRefresh} />
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

// ─── Date card helpers ────────────────────────────────────────────────────────

function DateCard({ label, formValue, onChange, onRevert }: {
  readonly label: string
  readonly formValue: string
  readonly onChange: (v: string) => void
  readonly onRevert?: () => void
}) {
  return (
    <div className={cn("border border-green-200 bg-green-50 rounded-xl p-4 flex flex-col gap-2", onRevert && "group/card")}>
      <p className="text-xs font-medium text-green-700">{label}</p>
      <input type="date" value={formValue} onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-green-200 bg-white px-2 py-1.5 text-xs text-green-900 focus:outline-none focus:border-[#006fff] focus:bg-white transition-colors" />
      {onRevert && (
        <button type="button" onClick={onRevert}
          className="opacity-0 group-hover/card:opacity-100 w-full px-2 py-1 bg-white hover:bg-red-50 text-red-500 border border-red-200 text-xs font-medium rounded-lg transition-all">
          Revert
        </button>
      )}
    </div>
  )
}

function LockedDateCard({ label }: { readonly label: string }) {
  return (
    <div className="border border-gray-100 bg-gray-50 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-300">{label}</p>
      <p className="text-sm font-medium text-gray-300 mt-1">—</p>
    </div>
  )
}
