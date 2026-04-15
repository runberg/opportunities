"use client"

import { useEffect, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X, Pencil, ChevronLeft } from "lucide-react"
import { cn, formatDate, formatDateTime, STATUS_GROUPS, STATUS_LABELS, PENDING_LABELS } from "@/lib/utils"
import { StatusBadge, PendingBadge } from "@/components/opportunities/status-badge"
import { DocumentSection } from "@/components/opportunities/document-section"
import { QuoteSection } from "@/components/opportunities/quote-section"
import { LogSection, type LogEntry } from "@/components/opportunities/log-section"
import { Button } from "@/components/ui/button"

// ─── Types ──────────────────────────────────────────────────────────────────

interface ModalDoc {
  id: string
  displayName: string
  originalName: string
  mimeType: string
  size: number
  type: string
  docStatus: string
  uploadedAt: string
  uploadedBy: { id: string; name: string }
}

interface OpportunityFull {
  id: string
  internalId: string | null
  title: string
  customer: string
  reference: string | null
  rfqDate: string | null
  product: string | null
  status: string
  waitingOn: string
  quoteSentDate: string | null
  description: string | null
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string }
  comments: LogEntry[]
  documents: ModalDoc[]
}

interface EditForm {
  internalId: string
  title: string
  customer: string
  reference: string
  rfqDate: string
  product: string
  status: string
  waitingOn: string
  description: string
}

// ─── Main modal ─────────────────────────────────────────────────────────────

interface OpportunityModalProps {
  opportunityId: string | null
  onClose: () => void
  currentUserId: string
  isAdmin: boolean
}

export function OpportunityModal({
  opportunityId,
  onClose,
  currentUserId,
  isAdmin,
}: OpportunityModalProps) {
  const router = useRouter()
  const [data, setData] = useState<OpportunityFull | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState("")
  const [mode, setMode] = useState<"view" | "edit">("view")
  const [refreshKey, setRefreshKey] = useState(0)

  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1)
    router.refresh()
  }, [router])

  // Fetch data
  useEffect(() => {
    if (!opportunityId) {
      setData(null)
      setMode("view")
      return
    }
    setLoading(true)
    setFetchError("")
    fetch(`/api/opportunities/${opportunityId}`)
      .then((r) => {
        if (!r.ok) throw new Error("Not found")
        return r.json()
      })
      .then((d) => {
        setData(d)
        setLoading(false)
      })
      .catch(() => {
        setFetchError("Failed to load opportunity.")
        setLoading(false)
      })
  }, [opportunityId, refreshKey])

  // Keyboard close
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (mode === "edit") {
          setMode("view")
        } else {
          onClose()
        }
      }
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose, mode])

  // Lock body scroll
  useEffect(() => {
    if (opportunityId) {
      document.body.style.overflow = "hidden"
    }
    return () => {
      document.body.style.overflow = ""
    }
  }, [opportunityId])

  function enterEdit() {
    if (!data) return
    setEditForm({
      internalId: data.internalId ?? "",
      title: data.title,
      customer: data.customer,
      reference: data.reference ?? "",
      rfqDate: data.rfqDate ? data.rfqDate.split("T")[0] : "",
      product: data.product ?? "",
      status: data.status,
      waitingOn: data.waitingOn,
      description: data.description ?? "",
    })
    setSaveError("")
    setMode("edit")
  }

  async function handleSave() {
    if (!editForm || !data) return
    setSaving(true)
    setSaveError("")
    const res = await fetch(`/api/opportunities/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setSaveError(d.error ?? "Failed to save.")
      return
    }
    setMode("view")
    refresh()
  }

  function setField(field: keyof EditForm, value: string) {
    setEditForm((f) => (f ? { ...f, [field]: value } : f))
  }

  if (!opportunityId) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-start justify-center p-4 pt-[4vh]">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/40" onClick={mode === "edit" ? undefined : onClose} />

        {/* Modal panel */}
        <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl mb-8">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-3 border-b border-gray-100">
            {mode === "edit" ? (
              <button
                type="button"
                onClick={() => setMode("view")}
                className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
              >
                <ChevronLeft size={15} />
                Back to view
              </button>
            ) : (
              <span className="text-xs text-gray-400 font-medium tracking-wide uppercase">
                Opportunity
              </span>
            )}
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
            {loading && (
              <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
            )}
            {fetchError && (
              <div className="py-16 text-center text-red-500 text-sm">{fetchError}</div>
            )}
            {!loading && !fetchError && data && (
              <>
                {mode === "view" ? (
                  <ViewMode
                    data={data}
                    onEdit={enterEdit}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    onRefresh={refresh}
                  />
                ) : (
                  <EditMode
                    data={data}
                    form={editForm!}
                    setField={setField}
                    onCancel={() => setMode("view")}
                    onSave={handleSave}
                    saving={saving}
                    saveError={saveError}
                    currentUserId={currentUserId}
                    isAdmin={isAdmin}
                    onRefresh={refresh}
                  />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── View mode ───────────────────────────────────────────────────────────────

function ViewMode({
  data,
  onEdit,
  currentUserId,
  isAdmin,
  onRefresh,
}: {
  data: OpportunityFull
  onEdit: () => void
  currentUserId: string
  isAdmin: boolean
  onRefresh: () => void
}) {
  return (
    <div>
      {/* Title + actions */}
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900 leading-tight">{data.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusBadge status={data.status} />
            <PendingBadge waitingOn={data.waitingOn} />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={onEdit} className="flex-shrink-0 mt-1">
          <Pencil size={13} className="mr-1.5" />
          Edit
        </Button>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <InfoCard label="Customer" value={data.customer} />
        {data.internalId && <InfoCard label="Internal ID" value={data.internalId} />}
        {data.reference && <InfoCard label="Quote Reference" value={data.reference} />}
        {data.rfqDate && (
          <InfoCard label="RFQ Date" value={formatDate(data.rfqDate)} />
        )}
        {data.quoteSentDate && (
          <InfoCard label="Quote Sent" value={formatDate(data.quoteSentDate)} />
        )}
        {data.product && (
          <InfoCard label="Product / Service" value={data.product} wide />
        )}
        <InfoCard label="Created by" value={data.createdBy.name} />
        <InfoCard label="Last updated" value={formatDateTime(data.updatedAt)} />
      </div>

      {/* Notes */}
      {data.description && (
        <div className="mb-5 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{data.description}</p>
        </div>
      )}

      {/* Documents */}
      <DocumentSection
        opportunityId={data.id}
        documents={data.documents as never}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onRefresh={onRefresh}
      />

      {/* Log */}
      <LogSection
        opportunityId={data.id}
        entries={data.comments}
        currentUser={{ id: currentUserId, name: "" }}
        onRefresh={onRefresh}
      />
    </div>
  )
}

// ─── Edit mode ───────────────────────────────────────────────────────────────

function EditMode({
  data,
  form,
  setField,
  onCancel,
  onSave,
  saving,
  saveError,
  currentUserId,
  isAdmin,
  onRefresh,
}: {
  data: OpportunityFull
  form: EditForm
  setField: (f: keyof EditForm, v: string) => void
  onCancel: () => void
  onSave: () => void
  saving: boolean
  saveError: string
  currentUserId: string
  isAdmin: boolean
  onRefresh: () => void
}) {
  return (
    <div>
      {/* Title input */}
      <div className="mb-5">
        <input
          value={form.title}
          onChange={(e) => setField("title", e.target.value)}
          placeholder="Opportunity title"
          className="w-full text-2xl font-semibold text-gray-900 bg-transparent border-b-2 border-gray-200 focus:border-gray-900 outline-none pb-1 leading-tight"
        />
        {/* Status + Pending selects shown inline like badges */}
        <div className="flex flex-wrap items-center gap-2 mt-3">
          <select
            value={form.status}
            onChange={(e) => setField("status", e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-full text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            {STATUS_GROUPS.map((group) => (
              <optgroup key={group.label} label={group.label}>
                {group.statuses.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <select
            value={form.waitingOn}
            onChange={(e) => setField("waitingOn", e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-full text-xs font-medium bg-white focus:outline-none focus:ring-1 focus:ring-gray-400"
          >
            <option value="INTERNAL">Pending: Internal</option>
            <option value="CUSTOMER">Pending: Customer</option>
            <option value="THIRD_PARTY">Pending: Third Party</option>
          </select>
        </div>
      </div>

      {/* Info grid with inputs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <EditCard label="Customer *" required>
          <input
            value={form.customer}
            onChange={(e) => setField("customer", e.target.value)}
            className={inputCls}
            required
          />
        </EditCard>
        <EditCard label="Internal ID">
          <input
            value={form.internalId}
            onChange={(e) => setField("internalId", e.target.value)}
            maxLength={10}
            placeholder="e.g. 0001"
            className={inputCls}
          />
        </EditCard>
        <EditCard label="Quote Reference">
          <input
            value={form.reference}
            onChange={(e) => setField("reference", e.target.value)}
            className={inputCls}
          />
        </EditCard>
        <EditCard label="RFQ Date">
          <input
            type="date"
            value={form.rfqDate}
            onChange={(e) => setField("rfqDate", e.target.value)}
            className={inputCls}
          />
        </EditCard>
        <EditCard label="Product / Service" wide>
          <input
            value={form.product}
            onChange={(e) => setField("product", e.target.value)}
            className={inputCls}
          />
        </EditCard>
      </div>

      {/* Notes */}
      <div className="mb-5 p-4 bg-gray-50 border border-gray-200 rounded-xl">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
        <textarea
          value={form.description}
          onChange={(e) => setField("description", e.target.value)}
          rows={3}
          placeholder="Additional context, requirements, or background…"
          className="w-full text-sm text-gray-700 bg-transparent resize-none focus:outline-none placeholder-gray-400"
        />
      </div>

      {/* Quote section */}
      <QuoteSection
        opportunityId={data.id}
        currentStatus={form.status}
        quoteSentDate={data.quoteSentDate ? data.quoteSentDate.split("T")[0] : null}
        documents={data.documents
          .filter((d) => d.type === "QUOTE")
          .map((d) => ({ ...d, uploadedAt: d.uploadedAt }))}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onRefresh={onRefresh}
      />

      {/* Save / cancel */}
      {saveError && (
        <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {saveError}
        </p>
      )}
      <div className="flex items-center gap-3 mt-6 pt-5 border-t border-gray-100">
        <Button onClick={onSave} disabled={saving || !form.title.trim() || !form.customer.trim()}>
          {saving ? "Saving…" : "Save Changes"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>

      {/* Log (still visible in edit mode) */}
      <LogSection
        opportunityId={data.id}
        entries={data.comments}
        currentUser={{ id: currentUserId, name: "" }}
        onRefresh={onRefresh}
      />
    </div>
  )
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const inputCls =
  "w-full text-sm font-medium text-gray-900 bg-transparent border-b border-gray-200 focus:border-gray-600 outline-none py-0.5"

function InfoCard({
  label,
  value,
  wide = false,
}: {
  label: string
  value: string | null | undefined
  wide?: boolean
}) {
  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-xl p-4",
        wide && "col-span-2"
      )}
    >
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900 truncate">{value ?? "—"}</p>
    </div>
  )
}

function EditCard({
  label,
  children,
  wide = false,
  required = false,
}: {
  label: string
  children: React.ReactNode
  wide?: boolean
  required?: boolean
}) {
  return (
    <div
      className={cn(
        "bg-white border border-gray-200 rounded-xl p-4",
        wide && "col-span-2"
      )}
    >
      <p className="text-xs font-medium text-gray-400 mb-2">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </p>
      {children}
    </div>
  )
}
