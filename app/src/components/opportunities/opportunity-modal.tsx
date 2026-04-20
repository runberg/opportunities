"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X, Pencil } from "lucide-react"
import { cn, formatDate, QUOTE_STATUSES, EL_STATUSES, PRODUCTION_STATUSES, STATUS_LABELS, todayISO, toDateString } from "@/lib/utils"
import { StatusBadge, PendingBadge } from "@/components/opportunities/status-badge"
import { QuoteSection } from "@/components/opportunities/quote-section"
import { ProductionSection } from "@/components/opportunities/production-section"
import { LogSection, type LogEntry } from "@/components/opportunities/log-section"
import { Button } from "@/components/ui/button"

const ALL_EL_STATUSES = [...EL_STATUSES, "EL_FULLY_SIGNED"]

// Which date field must be set for a given status
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

interface EditForm {
  internalId: string; title: string; customer: string; reference: string
  rfqDate: string; quoteSentDate: string; elRequestedDate: string
  elDraftSharedDate: string; elSignedSharedDate: string
  product: string; status: string; waitingOn: string; description: string
}

function initForm(data: OpportunityFull): EditForm {
  return {
    internalId: data.internalId ?? "",
    title: data.title,
    customer: data.customer,
    reference: data.reference ?? "",
    rfqDate: toDateString(data.rfqDate),
    quoteSentDate: toDateString(data.quoteSentDate),
    elRequestedDate: toDateString(data.elRequestedDate),
    elDraftSharedDate: toDateString(data.elDraftSharedDate),
    elSignedSharedDate: toDateString(data.elSignedSharedDate),
    product: data.product ?? "",
    status: data.status,
    waitingOn: data.waitingOn,
    description: data.description ?? "",
  }
}

// ─── Main modal ──────────────────────────────────────────────────────────────

export function OpportunityModal({
  opportunityId,
  onClose,
  currentUserId,
  isAdmin,
  initialAccept = false,
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

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    router.refresh()
  }, [router])

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
          {/* Top bar */}
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

          {/* Body */}
          <div className="px-6 py-6">
            {loading && <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>}
            {fetchError && <div className="py-16 text-center text-red-500 text-sm">{fetchError}</div>}
            {!loading && !fetchError && data && (
              <ViewMode
                data={data}
                currentUserId={currentUserId}
                isAdmin={isAdmin}
                onRefresh={refresh}
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

function ViewMode({ data, currentUserId, isAdmin, onRefresh, initialAccept }: {
  data: OpportunityFull
  currentUserId: string
  isAdmin: boolean
  onRefresh: () => void
  initialAccept?: boolean
}) {
  const isEL = ALL_EL_STATUSES.includes(data.status)
  const isProduction = (PRODUCTION_STATUSES as readonly string[]).includes(data.status)
  const canAcceptQuote = data.status === "QUOTE_SENT"

  // Quote accept flow
  const [acceptingQuote, setAcceptingQuote] = useState(initialAccept ?? false)
  const [elDate, setElDate] = useState(todayISO())
  const [accepting, setAccepting] = useState(false)
  const [acceptError, setAcceptError] = useState("")

  // Counter-sign flow
  const [counterSigning, setCounterSigning] = useState(false)
  const [counterSigning2, setCounterSigning2] = useState(false)
  const [counterSignError, setCounterSignError] = useState("")

  // Inline details edit
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  function enterEdit() {
    setForm(initForm(data))
    setSaveError("")
    setEditing(true)
  }

  function setField(field: keyof EditForm, value: string) {
    setForm((f) => (f ? { ...f, [field]: value } : f))
  }

  async function handleSave() {
    if (!form) return
    const req = STATUS_DATE_REQUIRED[form.status]
    if (req && !form[req.field as keyof EditForm]) {
      setSaveError(`"${STATUS_LABELS[form.status]}" requires the "${req.label}" date to be set.`)
      return
    }
    setSaving(true)
    setSaveError("")
    const payload = { ...form }
    if (form.quoteSentDate && !data.quoteSentDate && form.status === "RFQ_RECEIVED") {
      payload.status = "QUOTE_SENT"
    }
    const res = await fetch(`/api/opportunities/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setSaveError(d.error ?? "Failed to save.")
      return
    }
    setEditing(false)
    onRefresh()
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

  // Derive missing field for highlight (only after a failed save attempt)
  const req = form ? STATUS_DATE_REQUIRED[form.status] : null
  const missingField = saveError && req && !form?.[req.field as keyof EditForm] ? req.field : null

  const isELForm = form ? ALL_EL_STATUSES.includes(form.status) : isEL
  const isProdForm = form ? (PRODUCTION_STATUSES as readonly string[]).includes(form.status) : isProduction
  const statusOptions = isProdForm
    ? ["PENDING_ADVANCE_PAYMENT", "IN_PRODUCTION", "DELIVERED"]
    : isELForm ? [...EL_STATUSES, "EL_FULLY_SIGNED"]
    : QUOTE_STATUSES

  return (
    <div>
      {/* ── Title row ── */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 leading-tight">{data.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
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
          </div>
        </div>
        {/* Action buttons — hidden while editing details */}
        {!editing && (
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
        )}
      </div>

      {/* Quote accepted inline panel */}
      {!editing && acceptingQuote && (
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
          {acceptError && <p className="w-full text-xs text-red-600 mt-1">{acceptError}</p>}
        </div>
      )}

      {/* Counter-sign inline panel */}
      {!editing && counterSigning && (
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
          {counterSignError && <p className="text-xs text-red-600 mt-1">{counterSignError}</p>}
        </div>
      )}

      {/* ── Details section — view or inline edit ── */}
      {editing && form ? (
        <div className="mb-5">
          {/* Edit header row */}
          <div className="flex items-center justify-between mb-4">
            <input
              value={form.title}
              onChange={(e) => setField("title", e.target.value)}
              placeholder="Opportunity title"
              className="flex-1 text-2xl font-semibold text-gray-900 bg-transparent border-b-2 border-gray-200 focus:border-gray-900 outline-none pb-1 leading-tight mr-4"
            />
            <div className="flex items-center gap-2 flex-shrink-0">
              <button type="button" onClick={handleSave}
                disabled={saving || !form.title.trim() || !form.customer.trim()}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
                {saving ? "Saving…" : "Save"}
              </button>
              <button type="button" onClick={() => setEditing(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Meta pills row */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            <select value={form.status} onChange={(e) => setField("status", e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-full text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-gray-400">
              {statusOptions.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <select value={form.waitingOn} onChange={(e) => setField("waitingOn", e.target.value)}
              className="px-3 py-1 border border-gray-300 rounded-full text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-gray-400">
              <option value="INTERNAL">Internal</option>
              <option value="CUSTOMER">Customer</option>
            </select>
            <label className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-300 rounded-full bg-white focus-within:ring-1 focus-within:ring-gray-400 cursor-text">
              <span className="text-xs text-gray-400 shrink-0">ID</span>
              <input value={form.internalId} onChange={(e) => setField("internalId", e.target.value)}
                maxLength={10} placeholder="—"
                className="text-xs font-medium text-gray-900 bg-transparent outline-none w-14" />
            </label>
            <label className="inline-flex items-center gap-1.5 px-3 py-1 border border-gray-300 rounded-full bg-white focus-within:ring-1 focus-within:ring-gray-400 cursor-text">
              <span className="text-xs text-gray-400 shrink-0">Ref.</span>
              <input value={form.reference} onChange={(e) => setField("reference", e.target.value)}
                placeholder="—"
                className="text-xs font-medium text-gray-900 bg-transparent outline-none w-24" />
            </label>
          </div>

          {/* Edit cards */}
          <div className="flex flex-col gap-3">
            <EditCard label="Customer" required>
              <input value={form.customer} onChange={(e) => setField("customer", e.target.value)}
                className={inputCls} />
            </EditCard>
            <EditCard label="Product / Service">
              <input value={form.product} onChange={(e) => setField("product", e.target.value)}
                className={inputCls} />
            </EditCard>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <EditCard label="RFQ Date" highlight={missingField === "rfqDate"}>
                <input type="date" value={form.rfqDate}
                  onChange={(e) => setField("rfqDate", e.target.value)} className={inputCls} />
              </EditCard>
              <EditCard label="Quote Shared" highlight={missingField === "quoteSentDate"}>
                <input type="date" value={form.quoteSentDate}
                  onChange={(e) => setField("quoteSentDate", e.target.value)} className={inputCls} />
              </EditCard>
              <EditCard label="EL Requested" highlight={missingField === "elRequestedDate"}>
                <input type="date" value={form.elRequestedDate}
                  onChange={(e) => setField("elRequestedDate", e.target.value)} className={inputCls} />
              </EditCard>
              <EditCard label="EL Draft Shared" highlight={missingField === "elDraftSharedDate"}>
                <input type="date" value={form.elDraftSharedDate}
                  onChange={(e) => setField("elDraftSharedDate", e.target.value)} className={inputCls} />
              </EditCard>
              <EditCard label="EL Signed Shared" highlight={missingField === "elSignedSharedDate"}>
                <input type="date" value={form.elSignedSharedDate}
                  onChange={(e) => setField("elSignedSharedDate", e.target.value)} className={inputCls} />
              </EditCard>
            </div>
            <EditCard label="Details">
              <textarea value={form.description} onChange={(e) => setField("description", e.target.value)}
                rows={3} placeholder="Additional context, requirements, or background…"
                className="w-full text-sm text-gray-700 bg-transparent resize-none focus:outline-none placeholder-gray-400" />
            </EditCard>
          </div>

          {saveError && (
            <p className="mt-3 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              {saveError}
            </p>
          )}
        </div>
      ) : (
        <div className="mb-5">
          <div className="flex justify-end mb-3">
            <button type="button" onClick={enterEdit}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
              <Pencil size={12} />Edit details
            </button>
          </div>
          <div className="flex flex-col gap-3">
            <InfoCard label="Customer" value={data.customer} />
            <InfoCard label="Product / Service" value={data.product} />
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <InfoCard label="RFQ Date" value={data.rfqDate ? formatDate(data.rfqDate) : null} />
              <InfoCard label="Quote Shared" value={data.quoteSentDate ? formatDate(data.quoteSentDate) : null} />
              <InfoCard label="EL Requested" value={data.elRequestedDate ? formatDate(data.elRequestedDate) : null} />
              <InfoCard label="EL Draft Shared" value={data.elDraftSharedDate ? formatDate(data.elDraftSharedDate) : null} />
              <InfoCard label="EL Signed Shared" value={data.elSignedSharedDate ? formatDate(data.elSignedSharedDate) : null} />
            </div>
            {data.description && (
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs font-medium text-gray-400 mb-2">Details</p>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.description}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Documents, Production, Log — always visible ── */}
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls = "w-full text-sm font-medium text-gray-900 bg-transparent border-b border-gray-200 focus:border-gray-600 outline-none py-0.5"

function InfoCard({ label, value, className }: {
  label: string; value: string | null | undefined; className?: string
}) {
  return (
    <div className={cn("bg-white border border-gray-200 rounded-xl p-4", className)}>
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900 truncate">{value ?? "—"}</p>
    </div>
  )
}

function EditCard({ label, children, className, required = false, highlight = false }: {
  label: string; children: React.ReactNode; className?: string; required?: boolean; highlight?: boolean
}) {
  return (
    <div className={cn(
      "border rounded-xl p-4 transition-colors",
      highlight ? "border-amber-400 bg-amber-50" : "bg-white border-gray-200",
      className
    )}>
      <p className={cn("text-xs font-medium mb-2", highlight ? "text-amber-700" : "text-gray-400")}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        {highlight && <span className="ml-1 font-semibold">— required</span>}
      </p>
      {children}
    </div>
  )
}
