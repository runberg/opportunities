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
        "w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0",
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

// ─── Confirm button pattern ───────────────────────────────────────────────────

function ConfirmPanel({
  label, confirmLabel, onConfirm, saving, onCancel,
  children,
}: {
  label: string
  confirmLabel: string
  onConfirm: () => void
  saving: boolean
  onCancel: () => void
  children?: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <div>
        <p className="text-xs font-semibold text-blue-900 mb-2">{label}</p>
        {children}
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={onConfirm} disabled={saving}
          className="px-3 py-1.5 bg-[#006fff] hover:bg-[#005ee6] text-white text-xs font-medium rounded-lg disabled:opacity-50 transition-colors">
          {saving ? "Saving…" : confirmLabel}
        </button>
        <button type="button" onClick={onCancel}
          className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800">
          Cancel
        </button>
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ProductionSection({ data, currentUserId, isAdmin, onRefresh }: ProductionSectionProps) {
  const router = useRouter()
  const [saving, setSaving] = useState<string | null>(null)

  // Advance payment
  const [showAdvancePanel, setShowAdvancePanel] = useState(false)
  const [advanceDate, setAdvanceDate] = useState(todayISO())

  // FAT
  const [showFatPanel, setShowFatPanel] = useState(false)
  const [fatDate, setFatDate] = useState(data.fatDate ?? "")
  const [showFatPassPanel, setShowFatPassPanel] = useState(false)

  // SAT
  const [showSatPanel, setShowSatPanel] = useState(false)
  const [satDate, setSatDate] = useState(data.satDate ?? "")
  const [showSatPassPanel, setShowSatPassPanel] = useState(false)
  const [togglingNA, setTogglingNA] = useState(false)

  // Delivery
  const [showDeliverPanel, setShowDeliverPanel] = useState(false)

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

  // Derived state
  const advancePaid = !!data.advancePaymentDate
  const inProduction = ["IN_PRODUCTION", "PRODUCTION"].includes(data.status) || advancePaid
  const fatPassed = !!data.fatPassedDate
  const satPassed = !!data.satPassedDate
  const delivered = data.status === "DELIVERED"
  const satNA = !data.satApplicable

  // Phase progress for the step indicator
  const satDone = satNA || satPassed

  return (
    <div className="mt-6 bg-white border border-gray-200 rounded-xl p-6">
      <h2 className="text-base font-semibold text-gray-900 mb-5">Production</h2>

      {/* Phase progress bar */}
      <div className="flex items-center gap-2 flex-wrap mb-6 p-3 bg-gray-50 border border-gray-100 rounded-xl">
        <PhaseStep label="Advance Payment" done={advancePaid} active={!advancePaid} />
        <PhaseDivider />
        <PhaseStep label="In Production" done={fatPassed} active={advancePaid && !fatPassed} />
        <PhaseDivider />
        <PhaseStep label="FAT" done={fatPassed} active={advancePaid && !fatPassed} />
        <PhaseDivider />
        <PhaseStep label={satNA ? "SAT (N/A)" : "SAT"} done={satDone} active={fatPassed && !satDone} />
        <PhaseDivider />
        <PhaseStep label="Delivered" done={delivered} active={satDone && !delivered} />
      </div>

      {/* ── Phase 1: Advance Payment ── */}
      <PhaseCard
        title="Advance Payment"
        done={advancePaid}
        doneLabel={`Received ${formatDate(data.advancePaymentDate!)}`}
      >
        {!advancePaid && (
          showAdvancePanel ? (
            <ConfirmPanel
              label="Confirm advance payment received"
              confirmLabel="Confirm"
              saving={saving === "advance"}
              onCancel={() => setShowAdvancePanel(false)}
              onConfirm={() => patch({ advancePaymentDate: advanceDate, waitingOn: "INTERNAL" }, "advance")
                .then((ok) => ok && setShowAdvancePanel(false))}
            >
              <div className="flex items-center gap-1.5 mb-0">
                <span className="text-xs text-blue-700">Date received</span>
                <input type="date" value={advanceDate} onChange={(e) => setAdvanceDate(e.target.value)}
                  className="text-xs border border-blue-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-blue-400" />
              </div>
            </ConfirmPanel>
          ) : (
            <button type="button" onClick={() => setShowAdvancePanel(true)}
              className="px-4 py-2 bg-[#006fff] hover:bg-[#005ee6] text-white text-sm font-medium rounded-lg transition-colors">
              Confirm Advance Payment Received →
            </button>
          )
        )}
      </PhaseCard>

      {/* ── Phase 2: FAT ── */}
      <PhaseCard title="FAT — Factory Acceptance Test" done={fatPassed}
        doneLabel={`Passed ${formatDate(data.fatPassedDate!)}`} locked={!advancePaid}>
        {advancePaid && !fatPassed && (
          <div className="space-y-3">
            {/* FAT date */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Scheduled date</span>
                <input type="date" value={fatDate}
                  onChange={(e) => setFatDate(e.target.value)}
                  onBlur={() => fatDate && patch({ fatDate }, "fatDate")}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400" />
              </div>
              {!showFatPassPanel && (
                <button type="button" onClick={() => setShowFatPassPanel(true)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors">
                  FAT Passed ✓
                </button>
              )}
            </div>
            {showFatPassPanel && (
              <ConfirmPanel
                label="Confirm FAT passed"
                confirmLabel="Confirm Passed"
                saving={saving === "fat"}
                onCancel={() => setShowFatPassPanel(false)}
                onConfirm={() => patch({ fatPassedDate: todayISO(), fatDate: fatDate || undefined }, "fat")
                  .then((ok) => ok && setShowFatPassPanel(false))}
              />
            )}
          </div>
        )}
        {/* FAT documents */}
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
        {/* N/A toggle always visible once FAT passed or if already N/A */}
        {(fatPassed || satNA) && (
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                setTogglingNA(true)
                patch({ satApplicable: satNA }, "satNA").then(() => setTogglingNA(false))
              }}
              disabled={togglingNA}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors",
                satNA
                  ? "bg-gray-100 border-gray-300 text-gray-600 hover:bg-gray-200"
                  : "bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
              )}
            >
              {satNA ? "Mark SAT applicable" : "Mark SAT as N/A"}
            </button>
          </div>
        )}
        {!satNA && fatPassed && !satPassed && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Scheduled date</span>
                <input type="date" value={satDate}
                  onChange={(e) => setSatDate(e.target.value)}
                  onBlur={() => satDate && patch({ satDate }, "satDate")}
                  className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400" />
              </div>
              {!showSatPassPanel && (
                <button type="button" onClick={() => setShowSatPassPanel(true)}
                  className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded-lg transition-colors">
                  SAT Passed ✓
                </button>
              )}
            </div>
            {showSatPassPanel && (
              <ConfirmPanel
                label="Confirm SAT passed"
                confirmLabel="Confirm Passed"
                saving={saving === "sat"}
                onCancel={() => setShowSatPassPanel(false)}
                onConfirm={() => patch({ satPassedDate: todayISO(), satDate: satDate || undefined }, "sat")
                  .then((ok) => ok && setShowSatPassPanel(false))}
              />
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
          showDeliverPanel ? (
            <ConfirmPanel
              label="Confirm delivery — this completes the production cycle"
              confirmLabel="Mark as Delivered"
              saving={saving === "deliver"}
              onCancel={() => setShowDeliverPanel(false)}
              onConfirm={() => patch({ deliveredDate: todayISO(), waitingOn: "NONE" }, "deliver")
                .then((ok) => ok && setShowDeliverPanel(false))}
            />
          ) : (
            <button type="button" onClick={() => setShowDeliverPanel(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors">
              Mark as Delivered →
            </button>
          )
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
