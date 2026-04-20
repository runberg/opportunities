"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronRight } from "lucide-react"
import { cn, formatDate, todayISO } from "@/lib/utils"
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

// ─── Phase step indicator ─────────────────────────────────────────────────────

function PhaseStep({ label, done, active }: { label: string; done: boolean; active: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0",
        done ? "bg-green-500 text-white" : active ? "bg-[#006fff] text-white" : "bg-gray-200 text-gray-400"
      )}>
        {done ? <Check size={11} /> : null}
      </div>
      <span className={cn(
        "text-xs font-medium whitespace-nowrap",
        done ? "text-green-600" : active ? "text-gray-900" : "text-gray-400"
      )}>{label}</span>
    </div>
  )
}

function PhaseDivider() {
  return <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function DateInput({ label, value, onChange, onBlur }: {
  label: string
  value: string
  onChange: (v: string) => void
  onBlur?: () => void
}) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400"
      />
    </div>
  )
}

function CheckButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="self-end px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors flex items-center gap-1.5"
    >
      <Check size={12} />
      {label}
    </button>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductionSection({ data, currentUserId, isAdmin, onRefresh }: ProductionSectionProps) {
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)

  const [advanceDate, setAdvanceDate] = useState(data.advancePaymentDate ? todayISO() : todayISO())
  const [fatDate, setFatDate] = useState(data.fatDate ?? "")
  const [satDate, setSatDate] = useState(data.satDate ?? "")
  const [togglingNA, setTogglingNA] = useState(false)

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
  const fatPassed = !!data.fatPassedDate
  const satPassed = !!data.satPassedDate
  const delivered = data.status === "DELIVERED"
  const satNA = !data.satApplicable
  const satDone = satNA || satPassed

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">Production</h2>

      {/* Phase progress bar */}
      <div className="flex items-center gap-2 flex-wrap mb-6 p-3 bg-gray-50 border border-gray-100 rounded-xl">
        <PhaseStep label="Advance Payment" done={advancePaid} active={!advancePaid} />
        <PhaseDivider />
        <PhaseStep label="FAT" done={fatPassed} active={advancePaid && !fatPassed} />
        <PhaseDivider />
        <PhaseStep label={satNA ? "SAT (N/A)" : "SAT"} done={satDone} active={fatPassed && !satDone} />
        <PhaseDivider />
        <PhaseStep label="Delivered" done={delivered} active={satDone && !delivered} />
      </div>

      {/* ── Phase 1: Advance Payment ── */}
      <PhaseCard title="Advance Payment" done={advancePaid}
        doneLabel={`Received ${formatDate(data.advancePaymentDate!)}`}>
        {!advancePaid && (
          <div className="flex items-end gap-3 flex-wrap">
            <DateInput label="Date received" value={advanceDate} onChange={setAdvanceDate} />
            <CheckButton
              label={saving === "advance" ? "Saving…" : "Payment Received"}
              onClick={() => patch({ advancePaymentDate: advanceDate, waitingOn: "INTERNAL" }, "advance")}
              disabled={!advanceDate || saving === "advance"}
            />
          </div>
        )}
      </PhaseCard>

      {/* ── Phase 2: FAT ── */}
      <PhaseCard title="FAT — Factory Acceptance Test" done={fatPassed}
        doneLabel={`Passed ${formatDate(data.fatPassedDate!)}`} locked={!advancePaid}>
        {advancePaid && !fatPassed && (
          <div className="flex items-end gap-3 flex-wrap">
            <DateInput
              label="FAT date"
              value={fatDate}
              onChange={setFatDate}
              onBlur={() => fatDate && patch({ fatDate }, "fatDate")}
            />
            <CheckButton
              label={saving === "fat" ? "Saving…" : "FAT Passed"}
              onClick={() => patch({ fatPassedDate: todayISO(), fatDate: fatDate || undefined }, "fat")}
              disabled={saving === "fat"}
            />
          </div>
        )}
        {advancePaid && (
          <div className="mt-4">
            <QuoteSection opportunityId={data.id}
              documents={data.documents.filter((d) => d.type === "FAT")}
              currentUserId={currentUserId} isAdmin={isAdmin} onRefresh={onRefresh} docType="FAT" />
          </div>
        )}
      </PhaseCard>

      {/* ── Phase 3: SAT ── */}
      <PhaseCard
        title="SAT — Site Acceptance Test"
        done={satDone}
        doneLabel={satNA ? "Not applicable" : `Passed ${formatDate(data.satPassedDate!)}`}
        locked={!fatPassed && !satNA}
      >
        {(fatPassed || satNA) && (
          <div className="flex items-end gap-3 flex-wrap">
            {/* N/A toggle */}
            <button
              type="button"
              onClick={() => {
                setTogglingNA(true)
                patch({ satApplicable: satNA }, "satNA").then(() => setTogglingNA(false))
              }}
              disabled={togglingNA || satPassed}
              className={cn(
                "self-end px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                satNA
                  ? "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
              )}
            >
              {satNA ? "Mark SAT applicable" : "Mark SAT as N/A"}
            </button>

            {!satNA && !satPassed && (
              <>
                <DateInput
                  label="SAT date"
                  value={satDate}
                  onChange={setSatDate}
                  onBlur={() => satDate && patch({ satDate }, "satDate")}
                />
                <CheckButton
                  label={saving === "sat" ? "Saving…" : "SAT Passed"}
                  onClick={() => patch({ satPassedDate: todayISO(), satDate: satDate || undefined }, "sat")}
                  disabled={saving === "sat"}
                />
              </>
            )}
          </div>
        )}
        {!satNA && fatPassed && (
          <div className="mt-4">
            <QuoteSection opportunityId={data.id}
              documents={data.documents.filter((d) => d.type === "SAT")}
              currentUserId={currentUserId} isAdmin={isAdmin} onRefresh={onRefresh} docType="SAT" />
          </div>
        )}
      </PhaseCard>

      {/* ── Phase 4: Delivery ── */}
      <PhaseCard title="Delivery" done={delivered}
        doneLabel={`Delivered ${data.deliveredDate ? formatDate(data.deliveredDate) : ""}`}
        locked={!satDone}>
        {satDone && !delivered && (
          <CheckButton
            label={saving === "deliver" ? "Saving…" : "Mark as Delivered"}
            onClick={() => patch({ deliveredDate: todayISO(), waitingOn: "NONE" }, "deliver")}
            disabled={saving === "deliver"}
          />
        )}
      </PhaseCard>
    </div>
  )
}

// ─── Phase card wrapper ───────────────────────────────────────────────────────

function PhaseCard({
  title, done, doneLabel, locked = false, children,
}: {
  title: string
  done: boolean
  doneLabel?: string
  locked?: boolean
  children?: React.ReactNode
}) {
  return (
    <div className={cn(
      "mb-4 border rounded-xl p-4 transition-colors",
      done ? "border-green-200 bg-green-50" : locked ? "border-gray-100 bg-gray-50 opacity-50" : "border-gray-200 bg-white"
    )}>
      <div className="flex items-center gap-2 mb-3">
        <div className={cn(
          "w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0",
          done ? "bg-green-500" : "bg-gray-200"
        )}>
          {done && <Check size={9} className="text-white" />}
        </div>
        <h3 className={cn("text-sm font-semibold", done ? "text-green-800" : "text-gray-900")}>{title}</h3>
        {done && doneLabel && (
          <span className="text-xs text-green-600 ml-1">— {doneLabel}</span>
        )}
      </div>
      {!locked && children}
    </div>
  )
}
