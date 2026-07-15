"use client"

import { useEffect, useState, useCallback, useRef } from "react"
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
import { FormField } from "@/shared/components/ui/form-field"
import { DatePicker } from "@/shared/components/ui/date-picker"

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

interface ModalDelivery {
  id: string; unitType: string; quantity: number
  deliveryMonth: number; deliveryYear: number
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
  comments: LogEntry[]; documents: ModalDoc[]; deliveries: ModalDelivery[]
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export function OpportunityModal({
  opportunityId, onClose, currentUserId, isAdmin, justCreated = false,
}: {
  readonly opportunityId: string | null
  readonly onClose: () => void
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly justCreated?: boolean
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
        <div className="relative bg-gray-800 rounded-2xl shadow-2xl w-full max-w-3xl mb-8">
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-700">
            <span className="text-xs text-gray-500 font-medium tracking-wide uppercase">
              {sectionLabel}
            </span>
            <button type="button" onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-gray-300 hover:bg-gray-700 rounded-lg transition-colors">
              <X size={17} />
            </button>
          </div>
          {justCreated && (
            <div className="px-6 pt-4">
              <div className="flex items-center gap-2 px-3 py-2.5 bg-green-900/20 border border-green-800 rounded-lg text-sm text-green-400">
                <span className="font-medium">Opportunity created.</span>
                <span className="text-green-500 text-xs">Add documents, details and comments below, or close to continue.</span>
              </div>
            </div>
          )}
          <div className="px-6 py-6">
            {loading && !data && <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>}
            {fetchError && <div className="py-16 text-center text-red-500 text-sm">{fetchError}</div>}
            {!fetchError && data && (
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

const inputCls = "w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 transition-colors"
const textareaCls = "w-full rounded-md border border-gray-600 bg-gray-700 px-3 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-gray-500 resize-none transition-colors"
const dateInputCls = "w-full rounded-md border border-gray-600 bg-gray-700 px-2 py-1.5 text-xs text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-500 transition-colors"

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
  const canSkipToEL = data.status === "RFQ_RECEIVED"

  // Unified form state
  const [form, setForm] = useState<OppForm>(() => makeForm(data))
  const [saving, setSaving] = useState(false)
  const [applyError, setApplyError] = useState("")
  // Tracks whether the user has pending edits — prevents form reset on background data refreshes
  // (e.g. document upload should not wipe unsaved field changes)
  const userDirtyRef = useRef(false)

  // Reset form when server data refreshes, but only if user hasn't made unsaved edits
  useEffect(() => { if (!userDirtyRef.current) setForm(makeForm(data)) }, [data])

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
    userDirtyRef.current = true
  }

  function discard() { setForm(makeForm(data)); setApplyError(""); userDirtyRef.current = false }

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
    if (err) {
      setApplyError(err)
    } else {
      userDirtyRef.current = false
    }
  }

  // Quote accepted panel
  const [acceptingQuote, setAcceptingQuote] = useState(false)
  const [elDate, setElDate] = useState(todayISO())
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState("")

  // Skip to EL panel
  const [skippingToEL, setSkippingToEL] = useState(false)
  const [skipElDate, setSkipElDate] = useState(todayISO())
  const [skipSaving, setSkipSaving] = useState(false)
  const [skipError, setSkipError] = useState("")

  // Counter-sign panel
  const [counterSigning, setCounterSigning] = useState(false)
  const [counterSignDate, setCounterSignDate] = useState(todayISO())
  const [counterSignSaving, setCounterSignSaving] = useState(false)
  const [counterSignError, setCounterSignError] = useState("")

  async function patchTransition(
    payload: Record<string, unknown>,
    setSaving: (v: boolean) => void,
    setError: (v: string) => void,
    onSuccess: () => void,
  ) {
    setSaving(true)
    setError("")
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        onSuccess()
        onRefresh()
      } else {
        const d = await res.json().catch(() => ({}))
        setError(d.error ?? "Failed to save. Please try again.")
      }
    } catch {
      setError("Network error. Please try again.")
    } finally {
      setSaving(false)
    }
  }

  function handleSkipToEL() {
    return patchTransition(
      { status: "EL_REQUEST_RECEIVED", elRequestedDate: skipElDate },
      setSkipSaving, setSkipError, () => setSkippingToEL(false),
    )
  }

  function handleAcceptQuote() {
    return patchTransition(
      { status: "EL_REQUEST_RECEIVED", elRequestedDate: elDate },
      setAccepting, setAcceptError, () => setAcceptingQuote(false),
    )
  }

  function handleCounterSigned() {
    return patchTransition(
      { status: "PENDING_ADVANCE_PAYMENT", elCountersignedDate: counterSignDate },
      setCounterSignSaving, setCounterSignError, () => setCounterSigning(false),
    )
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
          className="flex-1 min-w-0 text-2xl font-semibold text-gray-100 appearance-none bg-gray-800 focus:bg-gray-700 border-b border-transparent hover:border-gray-600 focus:outline-none focus:border-[#006fff] leading-tight transition-colors px-1 py-1.5 resize-none overflow-hidden"
        />
        <div className="flex items-center gap-2 flex-shrink-0 mt-1">
          {canSkipToEL && !skippingToEL && (
            <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-white border-0"
              onClick={() => setSkippingToEL(true)}>
              Skip to EL →
            </Button>
          )}
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
            className="px-3 py-1 border border-gray-600 rounded-full text-xs font-medium bg-gray-700 text-gray-100 focus:outline-none focus:border-[#006fff] transition-colors">
            {prodStatusOptions.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
          </select>
        ) : (
          <StatusBadge status={data.status} />
        )}
        <label className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-600 rounded-full bg-gray-700 focus-within:border-[#006fff] transition-colors cursor-text">
          <span className="text-xs text-gray-500 shrink-0">ID</span>
          <input value={form.internalId} onChange={(e) => set("internalId", e.target.value)}
            maxLength={10} placeholder="0000" className="text-xs font-medium text-gray-100 bg-transparent outline-none w-14" />
        </label>
        <label className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-600 rounded-full bg-gray-700 focus-within:border-[#006fff] transition-colors cursor-text">
          <span className="text-xs text-gray-500 shrink-0">Ref.</span>
          <input value={form.reference} onChange={(e) => set("reference", e.target.value)}
            placeholder="BTL-XXXXXXXX" className="text-xs font-medium text-gray-100 bg-transparent outline-none w-28" />
        </label>
      </div>

      {skippingToEL && (
        <TransitionPanel
          colorScheme="amber"
          title="Skip Quote — Move to EL Stage"
          description="The quote will not be shared. This moves the opportunity directly to the EL stage."
          dateLabel="EL Requested"
          date={skipElDate}
          onDateChange={setSkipElDate}
          onConfirm={handleSkipToEL}
          saving={skipSaving}
          onCancel={() => { setSkippingToEL(false); setSkipError("") }}
          error={skipError}
        />
      )}

      {acceptingQuote && (
        <TransitionPanel
          title="Transition to Engagement Letter"
          description="This will move the opportunity to the EL stage."
          dateLabel="EL Requested"
          date={elDate}
          onDateChange={setElDate}
          onConfirm={handleAcceptQuote}
          saving={accepting}
          onCancel={() => { setAcceptingQuote(false); setAcceptError("") }}
          error={acceptError}
        />
      )}

      {counterSigning && (
        <TransitionPanel
          title="EL Countersigned — Transition to Production"
          description="Records the countersigned date and moves the opportunity to Production."
          dateLabel="Countersigned date"
          date={counterSignDate}
          onDateChange={setCounterSignDate}
          onConfirm={handleCounterSigned}
          saving={counterSignSaving}
          onCancel={() => { setCounterSigning(false); setCounterSignError("") }}
          error={counterSignError}
        />
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
        <DateSection data={data} form={form} onSetDate={(key, value) => set(key, value)} onRefresh={onRefresh} onDirectPatch={directPatch} />
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
      {isEL || isProduction ? (
        <>
          <QuoteSection opportunityId={data.id}
            documents={data.documents.filter((d) => d.type === "EL")}
            currentUserId={currentUserId} isAdmin={isAdmin} onRefresh={onRefresh} docType="EL" />
          <div className="mt-4">
            <QuoteSection opportunityId={data.id}
              documents={data.documents.filter((d) => d.type === "QUOTE")}
              currentUserId={currentUserId} isAdmin={isAdmin} onRefresh={onRefresh} docType="QUOTE" />
          </div>
        </>
      ) : (
        <QuoteSection opportunityId={data.id}
          documents={data.documents.filter((d) => d.type === "QUOTE")}
          currentUserId={currentUserId} isAdmin={isAdmin} onRefresh={onRefresh} docType="QUOTE" />
      )}

      {isProduction && (
        <ProductionSection data={data} deliveries={data.deliveries} currentUserId={currentUserId} isAdmin={isAdmin} onRefresh={onRefresh} />
      )}

      <LogSection commentEndpoint={`/api/opportunities/${data.id}/comments`} entries={data.comments}
        currentUser={{ id: currentUserId, name: "" }} onRefresh={onRefresh} />
    </div>
  )
}

// ─── Transition panel ────────────────────────────────────────────────────────

function TransitionPanel({
  title, description, dateLabel, date, onDateChange,
  onConfirm, saving, onCancel, error, colorScheme = "green",
}: {
  readonly title: string
  readonly description: string
  readonly dateLabel: string
  readonly date: string
  readonly onDateChange: (v: string) => void
  readonly onConfirm: () => void
  readonly saving: boolean
  readonly onCancel: () => void
  readonly error: string
  readonly colorScheme?: "green" | "amber"
}) {
  const c = colorScheme === "amber"
    ? { bg: "bg-amber-900/20", border: "border-amber-700", heading: "text-amber-300", body: "text-amber-400", input: "border-amber-700 focus:ring-amber-500 text-amber-300", btn: "bg-amber-500 hover:bg-amber-600" }
    : { bg: "bg-green-900/20", border: "border-green-800", heading: "text-green-300", body: "text-green-400", input: "border-green-800 focus:ring-green-600 text-green-300", btn: "bg-green-600 hover:bg-green-700" }
  return (
    <div className={`mb-5 flex flex-wrap items-end gap-3 p-4 ${c.bg} border ${c.border} rounded-xl`}>
      <div>
        <p className={`text-xs font-semibold ${c.heading} mb-1`}>{title}</p>
        <p className={`text-xs ${c.body} mb-3`}>{description}</p>
        <div className="flex items-center gap-1.5">
          <span className={`text-xs ${c.body}`}>{dateLabel}</span>
          <DatePicker
            value={date}
            onChange={onDateChange}
            triggerClassName={`text-xs border ${c.input} rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 bg-gray-800 flex items-center`}
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onConfirm} disabled={saving || !date}
          className={`px-3 py-1.5 ${c.btn} text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors`}>
          {saving ? "Saving…" : "Confirm"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-gray-400 hover:text-gray-300">
          Cancel
        </button>
      </div>
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
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
    <div className="border border-gray-600 bg-gray-700 rounded-xl p-4 flex flex-col gap-2">
      <p className="text-xs font-medium text-gray-400">{label}</p>
      <DatePicker value={date} onChange={onDateChange} triggerClassName={dateInputCls + " flex items-center"} />
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
        <NADateCard label="Quote Shared" />
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

function DateSection({ data, form, onSetDate, onRefresh, onDirectPatch }: {
  readonly data: OpportunityFull
  readonly form: OppForm
  readonly onSetDate: (key: keyof OppForm, value: string) => void
  readonly onRefresh: () => void
  readonly onDirectPatch: (payload: Record<string, unknown>) => Promise<string | null>
}) {
  const isEL = (EL_STATUSES as readonly string[]).includes(data.status)
  const isQuote = (QUOTE_STATUSES as readonly string[]).includes(data.status)

  const setDate: SetDate = onSetDate

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
        <div className="mt-3 p-4 bg-red-900/20 border border-red-800 rounded-xl">
          <p className="text-xs font-medium text-red-400 mb-3">
            Revert status to <span className="font-semibold">"{revertTarget.label}"</span>? The milestone date will be cleared.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleRevert} disabled={reverting}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
              {reverting ? "Reverting…" : "Confirm Revert"}
            </button>
            <button type="button" onClick={() => { setRevertTarget(null); setRevertError("") }}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-300 transition-colors">
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
    <div className={cn("border border-green-800 bg-green-900/20 rounded-xl p-4 flex flex-col gap-2", onRevert && "group/card")}>
      <p className="text-xs font-medium text-green-400">{label}</p>
      <DatePicker
        value={formValue}
        onChange={onChange}
        triggerClassName="w-full rounded-md border border-green-800 bg-gray-800 px-2 py-1.5 text-xs text-green-300 focus:outline-none focus:border-[#006fff] transition-colors flex items-center"
      />
      {onRevert && (
        <button type="button" onClick={onRevert}
          className="opacity-0 group-hover/card:opacity-100 w-full px-2 py-1 bg-gray-800 hover:bg-red-900/20 text-red-400 border border-red-800 text-xs font-medium rounded-lg transition-all">
          Revert
        </button>
      )}
    </div>
  )
}

function LockedDateCard({ label }: { readonly label: string }) {
  return (
    <div className="border border-gray-700 bg-gray-800/50 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-500 mt-1">—</p>
    </div>
  )
}

function NADateCard({ label }: { readonly label: string }) {
  return (
    <div className="border border-gray-700 bg-gray-800/50 rounded-xl p-4">
      <p className="text-xs font-medium text-gray-500">{label}</p>
      <p className="text-sm font-medium text-gray-500 mt-1">N/A</p>
    </div>
  )
}
