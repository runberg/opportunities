"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check } from "lucide-react"
import { cn, formatDate, todayISO, toDateString } from "@/lib/utils"
import { QuoteSection } from "@/components/opportunities/quote-section"

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
  data: ProductionData
  currentUserId: string
  isAdmin: boolean
  onRefresh: () => void
}

export function ProductionSection({ data, currentUserId, isAdmin, onRefresh }: ProductionSectionProps) {
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)

  const [advanceDate, setAdvanceDate] = useState(todayISO())
  const [fatDate, setFatDate] = useState(toDateString(data.fatDate))
  const [satDate, setSatDate] = useState(toDateString(data.satDate))

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

  const advancePaid   = !!data.advancePaymentDate
  const fatPassed     = !!data.fatPassedDate
  const satPassed     = !!data.satPassedDate
  const delivered     = data.status === "DELIVERED"
  const satNA         = !data.satApplicable
  const satDone       = satNA || satPassed
  const canDeliver    = satDone && !delivered

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">Production</h2>

      {/* Dates row — same pattern as the dates grid in view/edit mode */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">

        {/* Advance Payment */}
        <DateCard
          label="Advance Payment"
          done={advancePaid}
          doneValue={advancePaid ? formatDate(data.advancePaymentDate!) : null}
        >
          <input
            type="date"
            value={advanceDate}
            onChange={(e) => setAdvanceDate(e.target.value)}
            className={dateCls}
          />
          <ActionButton
            label="Received"
            savingKey="advance"
            saving={saving}
            disabled={!advanceDate}
            onClick={() => patch({ advancePaymentDate: advanceDate, waitingOn: "INTERNAL" }, "advance")}
          />
        </DateCard>

        {/* FAT */}
        <DateCard
          label="FAT"
          done={fatPassed}
          doneValue={fatPassed ? formatDate(data.fatPassedDate!) : null}
          locked={!advancePaid}
        >
          <input
            type="date"
            value={fatDate}
            onChange={(e) => setFatDate(e.target.value)}
            onBlur={() => fatDate && patch({ fatDate }, "fatDate")}
            className={dateCls}
          />
          <ActionButton
            label="Passed"
            savingKey="fat"
            saving={saving}
            onClick={() => patch({ fatPassedDate: todayISO(), fatDate: fatDate || undefined }, "fat")}
          />
        </DateCard>

        {/* SAT */}
        <DateCard
          label="SAT"
          done={satDone}
          doneValue={satNA ? "N/A" : satPassed ? formatDate(data.satPassedDate!) : null}
          locked={!fatPassed && !satNA}
          na={satNA}
          naToggle={fatPassed || satNA ? () => patch({ satApplicable: satNA }, "satNA") : undefined}
          naToggleSaving={saving === "satNA"}
        >
          <input
            type="date"
            value={satDate}
            onChange={(e) => setSatDate(e.target.value)}
            onBlur={() => satDate && patch({ satDate }, "satDate")}
            disabled={satNA}
            className={cn(dateCls, satNA && "opacity-40 cursor-not-allowed")}
          />
          <ActionButton
            label="Passed"
            savingKey="sat"
            saving={saving}
            disabled={satNA}
            onClick={() => patch({ satPassedDate: todayISO(), satDate: satDate || undefined }, "sat")}
          />
        </DateCard>

        {/* Delivered */}
        <DateCard
          label="Delivered"
          done={delivered}
          doneValue={delivered && data.deliveredDate ? formatDate(data.deliveredDate) : null}
          locked={!satDone}
          deliverButton={canDeliver ? (
            <ActionButton
              label="Mark Delivered"
              savingKey="deliver"
              saving={saving}
              onClick={() => patch({ deliveredDate: todayISO(), waitingOn: "NONE" }, "deliver")}
              green
            />
          ) : undefined}
        />

      </div>

      {/* FAT documents */}
      {advancePaid && (
        <div className="mb-4">
          <QuoteSection
            opportunityId={data.id}
            documents={data.documents.filter((d) => d.type === "FAT")}
            currentUserId={currentUserId}
            isAdmin={isAdmin}
            onRefresh={onRefresh}
            docType="FAT"
          />
        </div>
      )}

      {/* SAT documents — hidden when N/A */}
      {fatPassed && !satNA && (
        <QuoteSection
          opportunityId={data.id}
          documents={data.documents.filter((d) => d.type === "SAT")}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onRefresh={onRefresh}
          docType="SAT"
        />
      )}
    </div>
  )
}

// ─── Date card ────────────────────────────────────────────────────────────────

function DateCard({
  label, done, doneValue, locked = false, na = false,
  naToggle, naToggleSaving = false,
  deliverButton, children,
}: {
  label: string
  done: boolean
  doneValue: string | null
  locked?: boolean
  na?: boolean
  naToggle?: () => void
  naToggleSaving?: boolean
  deliverButton?: React.ReactNode
  children?: React.ReactNode
}) {
  return (
    <div className={cn(
      "border rounded-xl p-4 flex flex-col gap-2 transition-colors",
      done ? "border-green-200 bg-green-50" : locked ? "border-gray-100 bg-gray-50" : "border-gray-200 bg-white"
    )}>
      <div className="flex items-center justify-between gap-1">
        <p className={cn("text-xs font-medium", done ? "text-green-700" : locked ? "text-gray-300" : "text-gray-400")}>
          {label}
        </p>
        {done && <Check size={12} className="text-green-500 flex-shrink-0" />}
      </div>

      {done ? (
        <p className="text-sm font-semibold text-green-800">{doneValue ?? "—"}</p>
      ) : locked ? (
        <p className="text-sm font-medium text-gray-300">—</p>
      ) : (
        <>
          {deliverButton ?? children}
          {naToggle && (
            <button
              type="button"
              onClick={naToggle}
              disabled={naToggleSaving}
              className={cn(
                "mt-1 text-xs font-medium transition-colors text-left",
                na ? "text-gray-500 hover:text-gray-700" : "text-gray-400 hover:text-gray-600"
              )}
            >
              {na ? "Mark applicable" : "Mark as N/A"}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ─── Action button ────────────────────────────────────────────────────────────

function ActionButton({ label, savingKey, saving, onClick, disabled = false, green = false }: {
  label: string
  savingKey: string
  saving: string | null
  onClick: () => void
  disabled?: boolean
  green?: boolean
}) {
  const isSaving = saving === savingKey
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || isSaving}
      className={cn(
        "w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors disabled:opacity-40",
        green
          ? "bg-green-600 hover:bg-green-700 text-white"
          : "bg-[#006fff] hover:bg-[#005ee6] text-white"
      )}
    >
      <Check size={11} />
      {isSaving ? "Saving…" : label}
    </button>
  )
}

const dateCls = "w-full text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
