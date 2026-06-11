"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Pencil, X } from "lucide-react"
import { cn, formatDate, todayISO, toDateString } from "@/shared/lib/utils"
import { QuoteSection } from "@/modules/opportunities/components/quote-section"

interface ProductionData {
  id: string
  status: string
  advancePaymentDate: string | null
  fatDate: string | null
  fatPassedDate: string | null
  satApplicable: boolean
  satDate: string | null
  satPassedDate: string | null
  deliveredDate: string | null
  documents: { id: string; displayName: string; originalName: string; mimeType: string; size: number; type: string; docStatus: string; uploadedAt: string; uploadedBy: { id: string; name: string } }[]
}

interface ProductionSectionProps {
  readonly data: ProductionData
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onRefresh: () => void
}

interface ProdEditForm {
  advancePaymentDate: string
  fatDate: string
  fatPassedDate: string
  satApplicable: boolean
  satDate: string
  satPassedDate: string
  deliveredDate: string
}

function formFromData(data: ProductionData): ProdEditForm {
  return {
    advancePaymentDate: toDateString(data.advancePaymentDate),
    fatDate:            toDateString(data.fatDate),
    fatPassedDate:      toDateString(data.fatPassedDate),
    satApplicable:      data.satApplicable,
    satDate:            toDateString(data.satDate),
    satPassedDate:      toDateString(data.satPassedDate),
    deliveredDate:      toDateString(data.deliveredDate),
  }
}

// Infer the correct production status from the edited date values
function inferStatus(form: ProdEditForm): string {
  if (!form.advancePaymentDate) return "PENDING_ADVANCE_PAYMENT"
  if (form.deliveredDate)       return "DELIVERED"
  return "IN_PRODUCTION"
}

// ─── Module-level fetch helpers ───────────────────────────────────────────────

async function execPatch(
  opportunityId: string,
  payload: Record<string, unknown>,
  savingKey: string,
  setSaving: (v: string | null) => void,
  onRefresh: () => void,
  routerRefresh: () => void,
): Promise<boolean> {
  setSaving(savingKey)
  const res = await fetch(`/api/opportunities/${opportunityId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })
  setSaving(null)
  if (res.ok) { onRefresh(); routerRefresh() }
  return res.ok
}

async function execProductionRevert(
  opportunityId: string,
  target: { field: string; status: string },
  onSuccess: () => void,
  onError: (msg: string) => void,
  setReverting: (v: boolean) => void,
): Promise<void> {
  setReverting(true)
  try {
    const res = await fetch(`/api/opportunities/${opportunityId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [target.field]: null, status: target.status }),
    })
    if (res.ok) {
      onSuccess()
    } else {
      const d = await res.json().catch(() => ({}))
      onError(d.error ?? "Failed to revert.")
    }
  } catch {
    onError("Network error. Please try again.")
  } finally {
    setReverting(false)
  }
}

function onRevertIf(
  condition: boolean,
  target: { field: string; status: string; label: string },
  setter: (t: { field: string; status: string; label: string }) => void,
): (() => void) | undefined {
  return condition ? () => setter(target) : undefined
}

// ─── Revert confirmation ──────────────────────────────────────────────────────

function RevertConfirmation({ target, reverting, error, onConfirm, onCancel }: {
  readonly target: { label: string }
  readonly reverting: boolean
  readonly error: string
  readonly onConfirm: () => void
  readonly onCancel: () => void
}) {
  return (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
      <p className="text-xs font-medium text-red-800 mb-3">
        Revert status to <span className="font-semibold">"{target.label}"</span>? The milestone date will be cleared.
      </p>
      <div className="flex items-center gap-2">
        <button type="button" onClick={onConfirm} disabled={reverting}
          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
          {reverting ? "Reverting…" : "Confirm Revert"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 transition-colors">
          Cancel
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}

// ─── Edit panel ───────────────────────────────────────────────────────────────

function ProductionEditPanel({ data, onRefresh, onCancel }: {
  readonly data: ProductionData
  readonly onRefresh: () => void
  readonly onCancel: () => void
}) {
  const router = useRouter()
  const [editForm, setEditForm] = useState<ProdEditForm>(formFromData(data))
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")

  async function saveEdit() {
    setEditSaving(true); setEditError("")
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, status: inferStatus(editForm) }),
      })
      if (res.ok) {
        onCancel(); onRefresh(); router.refresh()
      } else {
        const d = await res.json().catch(() => ({}))
        setEditError(d.error ?? "Failed to save.")
      }
    } catch {
      setEditError("Network error. Please try again.")
    } finally {
      setEditSaving(false)
    }
  }

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">Production</h2>
        <div className="flex items-center gap-2">
          <button type="button" onClick={saveEdit} disabled={editSaving}
            className="px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
            {editSaving ? "Saving…" : "Save"}
          </button>
          <button type="button" onClick={onCancel}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={15} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <EditDateCard label="Advance Payment">
          <DateLabel text="Date received" />
          <input type="date" value={editForm.advancePaymentDate}
            onChange={(e) => setEditForm((f) => ({ ...f, advancePaymentDate: e.target.value }))}
            className={inputCls} />
        </EditDateCard>

        <EditDateCard label="FAT">
          <DateLabel text="Scheduled" />
          <input type="date" value={editForm.fatDate}
            onChange={(e) => setEditForm((f) => ({ ...f, fatDate: e.target.value }))}
            className={inputCls} />
          <DateLabel text="Passed" className="mt-2" />
          <input type="date" value={editForm.fatPassedDate}
            onChange={(e) => setEditForm((f) => ({ ...f, fatPassedDate: e.target.value }))}
            className={inputCls} />
        </EditDateCard>

        <EditDateCard label="SAT">
          <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
            <input type="checkbox" checked={!editForm.satApplicable}
              onChange={(e) => setEditForm((f) => ({
                ...f,
                satApplicable: !e.target.checked,
                satDate: e.target.checked ? "" : f.satDate,
                satPassedDate: e.target.checked ? "" : f.satPassedDate,
              }))}
              className="rounded border-gray-300 text-gray-700" />
            <span className="text-xs text-gray-600">Not applicable (N/A)</span>
          </label>
          <DateLabel text="Scheduled" />
          <input type="date" value={editForm.satDate}
            disabled={!editForm.satApplicable}
            onChange={(e) => setEditForm((f) => ({ ...f, satDate: e.target.value }))}
            className={cn(inputCls, !editForm.satApplicable && "opacity-40 cursor-not-allowed")} />
          <DateLabel text="Passed" className="mt-2" />
          <input type="date" value={editForm.satPassedDate}
            disabled={!editForm.satApplicable}
            onChange={(e) => setEditForm((f) => ({ ...f, satPassedDate: e.target.value }))}
            className={cn(inputCls, !editForm.satApplicable && "opacity-40 cursor-not-allowed")} />
        </EditDateCard>

        <EditDateCard label="Delivered">
          <DateLabel text="Date delivered" />
          <input type="date" value={editForm.deliveredDate}
            onChange={(e) => setEditForm((f) => ({ ...f, deliveredDate: e.target.value }))}
            className={inputCls} />
        </EditDateCard>
      </div>
      <p className="mt-3 text-xs text-gray-400">Clear a date to undo that milestone. Status will be recalculated on save.</p>
      {editError && <p className="mt-2 text-xs text-red-600">{editError}</p>}
    </div>
  )
}

// ─── View panel ───────────────────────────────────────────────────────────────

function ProductionViewPanel({ data, currentUserId, isAdmin, onRefresh, onEnterEdit }: {
  readonly data: ProductionData
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly onRefresh: () => void
  readonly onEnterEdit: () => void
}) {
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)
  const [advanceDate, setAdvanceDate] = useState(todayISO())
  const [fatDate, setFatDate] = useState(toDateString(data.fatDate))
  const [satDate, setSatDate] = useState(toDateString(data.satDate))
  const [revertTarget, setRevertTarget] = useState<{ field: string; status: string; label: string } | null>(null)
  const [reverting, setReverting] = useState(false)
  const [revertError, setRevertError] = useState("")

  function patch(payload: Record<string, unknown>, savingKey: string) {
    return execPatch(data.id, payload, savingKey, setSaving, onRefresh, router.refresh)
  }

  const advancePaid = !!data.advancePaymentDate
  const fatPassed   = !!data.fatPassedDate
  const satPassed   = !!data.satPassedDate
  const delivered   = data.status === "DELIVERED"
  const satNA       = !data.satApplicable
  const satDone     = satNA || satPassed
  const canDeliver  = satDone && !delivered

  let satDoneValue: string | null
  if (satNA) satDoneValue = "N/A"
  else if (satPassed) satDoneValue = formatDate(data.satPassedDate ?? "")
  else satDoneValue = null

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">Production</h2>
        <button type="button" onClick={onEnterEdit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
          <Pencil size={12} />Edit
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <DateCard label="Advance Payment" done={advancePaid}
          doneValue={advancePaid ? formatDate(data.advancePaymentDate ?? "") : null}
          onRevert={onRevertIf(advancePaid, { field: "advancePaymentDate", status: "PENDING_ADVANCE_PAYMENT", label: "Pending Advance Payment" }, setRevertTarget)}>
          <input type="date" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)} className={inputCls} />
          <ActionButton label="Received" savingKey="advance" saving={saving}
            disabled={!advanceDate} onClick={() => patch({ advancePaymentDate: advanceDate }, "advance")} />
        </DateCard>

        <DateCard label="FAT" done={fatPassed}
          doneValue={fatPassed ? formatDate(data.fatPassedDate ?? "") : null}
          locked={!advancePaid}
          onRevert={onRevertIf(fatPassed, { field: "fatPassedDate", status: "IN_PRODUCTION", label: "In Production" }, setRevertTarget)}>
          <input type="date" value={fatDate} onChange={(e) => setFatDate(e.target.value)}
            onBlur={() => fatDate && patch({ fatDate }, "fatDate")} className={inputCls} />
          <ActionButton label="Passed" savingKey="fat" saving={saving}
            onClick={() => patch({ fatPassedDate: todayISO(), fatDate: fatDate || undefined }, "fat")} />
        </DateCard>

        <DateCard label="SAT" done={satDone}
          doneValue={satDoneValue}
          locked={!fatPassed && !satNA}
          na={satNA}
          showNaToggle={fatPassed || satNA}
          onNaToggle={() => patch({ satApplicable: satNA }, "satNA")}
          naToggleSaving={saving === "satNA"}
          onRevert={onRevertIf(satPassed, { field: "satPassedDate", status: "IN_PRODUCTION", label: "In Production" }, setRevertTarget)}>
          <input type="date" value={satDate} onChange={(e) => setSatDate(e.target.value)}
            onBlur={() => satDate && patch({ satDate }, "satDate")}
            disabled={satNA} className={cn(inputCls, satNA && "opacity-40 cursor-not-allowed")} />
          <ActionButton label="Passed" savingKey="sat" saving={saving} disabled={satNA}
            onClick={() => patch({ satPassedDate: todayISO(), satDate: satDate || undefined }, "sat")} />
        </DateCard>

        <DateCard label="Delivered" done={delivered}
          doneValue={data.deliveredDate ? formatDate(data.deliveredDate) : null}
          locked={!satDone}
          onRevert={onRevertIf(delivered, { field: "deliveredDate", status: "IN_PRODUCTION", label: "In Production" }, setRevertTarget)}
          deliverButton={canDeliver ? (
            <ActionButton label="Mark Delivered" savingKey="deliver" saving={saving} green
              onClick={() => patch({ deliveredDate: todayISO() }, "deliver")} />
          ) : undefined} />
      </div>

      {revertTarget && (
        <RevertConfirmation
          target={revertTarget} reverting={reverting} error={revertError}
          onConfirm={() => void execProductionRevert(
            data.id, revertTarget,
            () => { setRevertTarget(null); onRefresh(); router.refresh() },
            setRevertError, setReverting,
          )}
          onCancel={() => { setRevertTarget(null); setRevertError("") }}
        />
      )}

      {advancePaid && (
        <div className="mb-4">
          <QuoteSection opportunityId={data.id}
            documents={data.documents.filter((d) => d.type === "FAT")}
            currentUserId={currentUserId} isAdmin={isAdmin} onRefresh={onRefresh} docType="FAT" />
        </div>
      )}

      {fatPassed && !satNA && (
        <QuoteSection opportunityId={data.id}
          documents={data.documents.filter((d) => d.type === "SAT")}
          currentUserId={currentUserId} isAdmin={isAdmin} onRefresh={onRefresh} docType="SAT" />
      )}
    </div>
  )
}

// ─── Main coordinator ─────────────────────────────────────────────────────────

export function ProductionSection({ data, currentUserId, isAdmin, onRefresh }: ProductionSectionProps) {
  const [editing, setEditing] = useState(false)

  if (editing) {
    return <ProductionEditPanel data={data} onRefresh={onRefresh} onCancel={() => setEditing(false)} />
  }

  return (
    <ProductionViewPanel
      data={data} currentUserId={currentUserId} isAdmin={isAdmin}
      onRefresh={onRefresh} onEnterEdit={() => setEditing(true)} />
  )
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function DateCard({
  label, done, doneValue, locked = false, na = false,
  showNaToggle = false, onNaToggle, naToggleSaving = false, deliverButton, onRevert, children,
}: {
  readonly label: string; readonly done: boolean; readonly doneValue: string | null
  readonly locked?: boolean; readonly na?: boolean
  readonly showNaToggle?: boolean; readonly onNaToggle?: () => void; readonly naToggleSaving?: boolean
  readonly deliverButton?: React.ReactNode; readonly onRevert?: () => void; readonly children?: React.ReactNode
}) {
  let borderCls: string
  if (done) borderCls = "border-green-200 bg-green-50"
  else if (locked) borderCls = "border-gray-100 bg-gray-50"
  else borderCls = "border-gray-200 bg-white"

  let labelCls: string
  if (done) labelCls = "text-green-700"
  else if (locked) labelCls = "text-gray-300"
  else labelCls = "text-gray-400"

  let cardContent: React.ReactNode
  if (done) {
    cardContent = (
      <>
        <p className="text-sm font-semibold text-green-800">{doneValue ?? "—"}</p>
        {onRevert && (
          <button type="button" onClick={onRevert}
            className="opacity-0 group-hover/card:opacity-100 w-full px-2 py-1 bg-white hover:bg-red-50 text-red-500 border border-red-200 text-xs font-medium rounded-lg transition-all">
            Revert
          </button>
        )}
      </>
    )
  } else if (locked) {
    cardContent = <p className="text-sm font-medium text-gray-300">—</p>
  } else {
    cardContent = (
      <>
        {deliverButton ?? children}
        {showNaToggle && (
          <button type="button" onClick={onNaToggle} disabled={naToggleSaving}
            className="mt-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors text-left">
            {na ? "Mark applicable" : "Mark as N/A"}
          </button>
        )}
      </>
    )
  }

  return (
    <div className={cn(
      "border rounded-xl p-4 flex flex-col gap-2 transition-colors",
      borderCls,
      done && onRevert && "group/card"
    )}>
      <div className="flex items-center justify-between gap-1">
        <p className={cn("text-xs font-medium", labelCls)}>
          {label}
        </p>
        {done && <Check size={12} className="text-green-500 flex-shrink-0" />}
      </div>

      {cardContent}
    </div>
  )
}

function EditDateCard({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="border border-gray-200 rounded-xl p-4 bg-white flex flex-col gap-1">
      <p className="text-xs font-medium text-gray-400 mb-2">{label}</p>
      {children}
    </div>
  )
}

function DateLabel({ text, className }: { readonly text: string; readonly className?: string }) {
  return <p className={cn("text-xs text-gray-500", className)}>{text}</p>
}

function ActionButton({ label, savingKey, saving, onClick, disabled = false, green = false }: {
  readonly label: string; readonly savingKey: string; readonly saving: string | null
  readonly onClick: () => void; readonly disabled?: boolean; readonly green?: boolean
}) {
  const isSaving = saving === savingKey
  return (
    <button type="button" onClick={onClick} disabled={disabled || isSaving}
      className={cn(
        "w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40",
        green ? "bg-green-600 hover:bg-green-700 text-white" : "bg-[#006fff] hover:bg-[#005ee6] text-white"
      )}>
      <Check size={11} />
      {isSaving ? "Saving…" : label}
    </button>
  )
}

const inputCls = "w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
