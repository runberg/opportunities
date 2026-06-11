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

export function ProductionSection({ data, currentUserId, isAdmin, onRefresh }: ProductionSectionProps) {
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)

  // View-mode quick-action state
  const [advanceDate, setAdvanceDate] = useState(todayISO())
  const [fatDate, setFatDate]         = useState(toDateString(data.fatDate))
  const [satDate, setSatDate]         = useState(toDateString(data.satDate))

  // Edit mode
  const [editing, setEditing]     = useState(false)
  const [editForm, setEditForm]   = useState<ProdEditForm>(formFromData(data))
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState("")

  // Revert
  const [revertTarget, setRevertTarget] = useState<{ field: string; status: string; label: string } | null>(null)
  const [reverting, setReverting] = useState(false)
  const [revertError, setRevertError] = useState("")

  function enterEdit() {
    setEditForm(formFromData(data))
    setEditing(true)
  }

  function cancelEdit() {
    setEditing(false)
    setEditError("")
  }

  async function handleProductionRevert() {
    if (!revertTarget) return
    setReverting(true)
    setRevertError("")
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [revertTarget.field]: null, status: revertTarget.status }),
      })
      if (res.ok) {
        setRevertTarget(null)
        onRefresh()
        router.refresh()
      } else {
        const d = await res.json().catch(() => ({}))
        setRevertError(d.error ?? "Failed to revert.")
      }
    } catch {
      setRevertError("Network error. Please try again.")
    } finally {
      setReverting(false)
    }
  }

  async function saveEdit() {
    setEditSaving(true)
    setEditError("")
    try {
      const res = await fetch(`/api/opportunities/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...editForm, status: inferStatus(editForm) }),
      })
      if (res.ok) {
        setEditing(false)
        onRefresh()
        router.refresh()
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

  async function patch(payload: Record<string, unknown>, savingKey: string) {
    setSaving(savingKey)
    const res = await fetch(`/api/opportunities/${data.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    setSaving(null)
    if (res.ok) { onRefresh(); router.refresh() }
    return res.ok
  }

  const advancePaid = !!data.advancePaymentDate
  const fatPassed   = !!data.fatPassedDate
  const satPassed   = !!data.satPassedDate
  const delivered   = data.status === "DELIVERED"
  const satNA       = !data.satApplicable
  const satDone     = satNA || satPassed
  const canDeliver  = satDone && !delivered

  // ── Edit mode ───────────────────────────────────────────────────────────────
  if (editing) {
    return (
      <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900">Production</h2>
          <div className="flex items-center gap-2">
            <button type="button" onClick={saveEdit} disabled={editSaving}
              className="px-3 py-1.5 bg-gray-900 hover:bg-gray-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
              {editSaving ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={cancelEdit}
              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
              <X size={15} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Advance Payment */}
          <EditDateCard label="Advance Payment">
            <DateLabel text="Date received" />
            <input type="date" value={editForm.advancePaymentDate}
              onChange={(e) => setEditForm((f) => ({ ...f, advancePaymentDate: e.target.value }))}
              className={inputCls} />
          </EditDateCard>

          {/* FAT */}
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

          {/* SAT */}
          <EditDateCard label="SAT">
            <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
              <input type="checkbox" checked={!editForm.satApplicable}
                onChange={(e) => setEditForm((f) => ({
                  ...f,
                  satApplicable: !e.target.checked,
                  // Clear SAT dates when marking N/A
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

          {/* Delivered */}
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

  // ── View mode ────────────────────────────────────────────────────────────────
  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-base font-semibold text-gray-900">Production</h2>
        <button type="button" onClick={enterEdit}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors">
          <Pencil size={12} />Edit
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">

        {/* Advance Payment */}
        <DateCard label="Advance Payment" done={advancePaid}
          doneValue={advancePaid ? formatDate(data.advancePaymentDate!) : null}
          onRevert={advancePaid ? () => setRevertTarget({ field: "advancePaymentDate", status: "PENDING_ADVANCE_PAYMENT", label: "Pending Advance Payment" }) : undefined}>
          <input type="date" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)}
            className={inputCls} />
          <ActionButton label="Received" savingKey="advance" saving={saving}
            disabled={!advanceDate}
            onClick={() => patch({ advancePaymentDate: advanceDate }, "advance")} />
        </DateCard>

        {/* FAT */}
        <DateCard label="FAT" done={fatPassed}
          doneValue={fatPassed ? formatDate(data.fatPassedDate!) : null}
          locked={!advancePaid}
          onRevert={fatPassed ? () => setRevertTarget({ field: "fatPassedDate", status: "IN_PRODUCTION", label: "In Production" }) : undefined}>
          <input type="date" value={fatDate} onChange={(e) => setFatDate(e.target.value)}
            onBlur={() => fatDate && patch({ fatDate }, "fatDate")}
            className={inputCls} />
          <ActionButton label="Passed" savingKey="fat" saving={saving}
            onClick={() => patch({ fatPassedDate: todayISO(), fatDate: fatDate || undefined }, "fat")} />
        </DateCard>

        {/* SAT */}
        <DateCard label="SAT" done={satDone}
          doneValue={satNA ? "N/A" : satPassed ? formatDate(data.satPassedDate!) : null}
          locked={!fatPassed && !satNA}
          na={satNA}
          naToggle={fatPassed || satNA ? () => patch({ satApplicable: satNA }, "satNA") : undefined}
          naToggleSaving={saving === "satNA"}
          onRevert={satPassed ? () => setRevertTarget({ field: "satPassedDate", status: "IN_PRODUCTION", label: "In Production" }) : undefined}>
          <input type="date" value={satDate} onChange={(e) => setSatDate(e.target.value)}
            onBlur={() => satDate && patch({ satDate }, "satDate")}
            disabled={satNA}
            className={cn(inputCls, satNA && "opacity-40 cursor-not-allowed")} />
          <ActionButton label="Passed" savingKey="sat" saving={saving} disabled={satNA}
            onClick={() => patch({ satPassedDate: todayISO(), satDate: satDate || undefined }, "sat")} />
        </DateCard>

        {/* Delivered */}
        <DateCard label="Delivered" done={delivered}
          doneValue={delivered && data.deliveredDate ? formatDate(data.deliveredDate) : null}
          locked={!satDone}
          onRevert={delivered ? () => setRevertTarget({ field: "deliveredDate", status: "IN_PRODUCTION", label: "In Production" }) : undefined}
          deliverButton={canDeliver ? (
            <ActionButton label="Mark Delivered" savingKey="deliver" saving={saving} green
              onClick={() => patch({ deliveredDate: todayISO() }, "deliver")} />
          ) : undefined} />
      </div>

      {revertTarget && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-xs font-medium text-red-800 mb-3">
            Revert status to <span className="font-semibold">"{revertTarget.label}"</span>? The milestone date will be cleared.
          </p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={handleProductionRevert} disabled={reverting}
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

// ─── Shared helpers ───────────────────────────────────────────────────────────

function DateCard({
  label, done, doneValue, locked = false, na = false,
  naToggle, naToggleSaving = false, deliverButton, onRevert, children,
}: {
  readonly label: string; readonly done: boolean; readonly doneValue: string | null
  readonly locked?: boolean; readonly na?: boolean
  readonly naToggle?: () => void; readonly naToggleSaving?: boolean
  readonly deliverButton?: React.ReactNode; readonly onRevert?: () => void; readonly children?: React.ReactNode
}) {
  return (
    <div className={cn(
      "border rounded-xl p-4 flex flex-col gap-2 transition-colors",
      done ? "border-green-200 bg-green-50" : locked ? "border-gray-100 bg-gray-50" : "border-gray-200 bg-white",
      done && onRevert && "group/card"
    )}>
      <div className="flex items-center justify-between gap-1">
        <p className={cn("text-xs font-medium", done ? "text-green-700" : locked ? "text-gray-300" : "text-gray-400")}>
          {label}
        </p>
        {done && <Check size={12} className="text-green-500 flex-shrink-0" />}
      </div>

      {done ? (
        <>
          <p className="text-sm font-semibold text-green-800">{doneValue ?? "—"}</p>
          {onRevert && (
            <button type="button" onClick={onRevert}
              className="opacity-0 group-hover/card:opacity-100 w-full px-2 py-1 bg-white hover:bg-red-50 text-red-500 border border-red-200 text-xs font-medium rounded-lg transition-all">
              Revert
            </button>
          )}
        </>
      ) : locked ? (
        <p className="text-sm font-medium text-gray-300">—</p>
      ) : (
        <>
          {deliverButton ?? children}
          {naToggle && (
            <button type="button" onClick={naToggle} disabled={naToggleSaving}
              className="mt-1 text-xs font-medium text-gray-400 hover:text-gray-600 transition-colors text-left">
              {na ? "Mark applicable" : "Mark as N/A"}
            </button>
          )}
        </>
      )}
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
