"use client"

import { useEffect, useState } from "react"
import { Pencil, Plus, Trash2 } from "lucide-react"
import { deliveredQuantity, type DeliveryLine } from "../deliveries/types"
import { ShipmentHistory } from "./shipment-history"

interface DeliveryRowState {
  id: string | null  // null = unsaved new row
  unitType: string
  quantity: string
  monthYear: string  // "YYYY-MM"
  editing: boolean
  saving: boolean
  error: string
}

function toMonthYear(month: number, year: number): string {
  return `${year}-${String(month).padStart(2, "0")}`
}

function parseMonthYear(v: string): { month: number; year: number } | null {
  const [y, m] = v.split("-").map(Number)
  if (!y || !m || m < 1 || m > 12) return null
  return { month: m, year: y }
}

function deliveryMonthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

function makeNewRow(): DeliveryRowState {
  const now = new Date()
  return {
    id: null,
    unitType: "",
    quantity: "",
    monthYear: toMonthYear(now.getMonth() + 1, now.getFullYear()),
    editing: true,
    saving: false,
    error: "",
  }
}

function fromDelivery(d: DeliveryLine): DeliveryRowState {
  return {
    id: d.id,
    unitType: d.unitType,
    quantity: String(d.quantity),
    monthYear: toMonthYear(d.deliveryMonth, d.deliveryYear),
    editing: false,
    saving: false,
    error: "",
  }
}

function toRows(lines: DeliveryLine[]): DeliveryRowState[] {
  return lines.length > 0 ? lines.map(fromDelivery) : [makeNewRow()]
}

function DeliveryViewRow({ row, delivery, opportunityId, onEdit, onDelete, onRefresh, isReadOnly, isAdmin }: {
  readonly isAdmin: boolean
  readonly delivery: DeliveryLine
  readonly opportunityId: string
  readonly onRefresh: () => void
  readonly row: DeliveryRowState
  readonly onEdit: () => void
  readonly onDelete: () => void
  readonly isReadOnly: boolean
}) {
  const delivered = deliveredQuantity(delivery.shipments)
  const remaining = delivery.quantity - delivered
  const status = remaining === 0 ? "Delivered" : delivered > 0 ? "Partially delivered" : "In progress"
  const statusClass = remaining === 0
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
    : delivered > 0 ? "bg-amber-100 text-amber-800 dark:bg-amber-400/10 dark:text-amber-300" : "bg-gray-100 text-gray-700"

  return (
    <ShipmentHistory delivery={delivery} opportunityId={opportunityId} remaining={remaining}
      isReadOnly={isReadOnly} isAdmin={isAdmin} onRefresh={onRefresh}
      summary={
        <div className="min-w-0 flex-[1_1_15rem] space-y-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="min-w-0 break-words text-sm font-semibold text-gray-900 dark:text-slate-100">{delivery.unitType}</h3>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${statusClass}`}>{status}</span>
          </div>
          <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-xs tabular-nums text-gray-600 dark:text-slate-400">
            <span>{deliveryMonthLabel(delivery.deliveryMonth, delivery.deliveryYear)}</span>
            <span><strong className="font-semibold text-gray-900 dark:text-slate-200">{delivered} / {delivery.quantity}</strong> delivered</span>
            <span>{remaining} remaining</span>
          </p>
        </div>
      }
      planActions={!isReadOnly && (
        <>
          <button type="button" onClick={onEdit} disabled={row.saving} aria-label="Edit delivery plan" title="Edit delivery plan"
            className="rounded p-1.5 text-gray-600 dark:text-slate-400 hover:bg-gray-100 hover:text-gray-900 dark:hover:bg-slate-700 dark:hover:text-slate-100"><Pencil size={14} /></button>
          {isAdmin && (
            <button type="button" onClick={onDelete} disabled={row.saving} aria-label="Delete delivery plan" title="Delete delivery plan"
              className="rounded p-1.5 text-gray-600 dark:text-slate-400 hover:bg-red-500/10 hover:text-red-300"><Trash2 size={14} /></button>
          )}
        </>
      )}
      error={row.error}
    />
  )
}

function DeliveryEditRow({ row, delivered, onChange, onSave, onCancel }: {
  readonly delivered: number
  readonly row: DeliveryRowState
  readonly onChange: (patch: Partial<DeliveryRowState>) => void
  readonly onSave: () => void
  readonly onCancel: () => void
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg">
      <input type="number" min={Math.max(1, delivered)} value={row.quantity} placeholder="Qty" aria-label="Planned quantity"
        onChange={(e) => onChange({ quantity: e.target.value })}
        className="w-16 text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#006fff]" />
      <input type="text" value={row.unitType} readOnly={delivered > 0} aria-label="Unit type" placeholder="Unit type (e.g. Units, Licences)"
        onChange={(e) => onChange({ unitType: e.target.value })}
        className="flex-1 min-w-32 text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#006fff]" />
      <input type="month" value={row.monthYear} aria-label="Expected month"
        onChange={(e) => onChange({ monthYear: e.target.value })}
        className="text-xs border border-gray-300 rounded-md px-2 py-1.5 focus:outline-none focus:border-[#006fff]" />
      <div className="flex gap-1.5">
        <button type="button" onClick={onSave} disabled={row.saving}
          className="px-2.5 py-1.5 bg-[#006fff] hover:bg-blue-700 text-white text-xs font-medium rounded-md disabled:opacity-50 transition-colors">
          {row.saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel}
          className="px-2.5 py-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors">
          Cancel
        </button>
      </div>
      {row.error && <p className="w-full text-xs text-red-500">{row.error}</p>}
    </div>
  )
}

export function ExpectedDeliverySection({ opportunityId, deliveries, isReadOnly, isAdmin, onRefresh }: {
  readonly opportunityId: string
  readonly isAdmin: boolean
  readonly deliveries: DeliveryLine[]
  readonly isReadOnly: boolean
  readonly onRefresh: () => void
}) {
  const [rows, setRows] = useState<DeliveryRowState[]>(() => toRows(deliveries))

  useEffect(() => { setRows(toRows(deliveries)) }, [deliveries])

  function updateRow(index: number, patch: Partial<DeliveryRowState>) {
    setRows((r) => r.map((row, i) => i === index ? { ...row, ...patch } : row))
  }

  function cancelRow(index: number) {
    const row = rows[index]
    if (!row.id) {
      const next = rows.filter((_, i) => i !== index)
      setRows(next.length > 0 ? next : [makeNewRow()])
      return
    }
    const original = deliveries.find((d) => d.id === row.id)
    if (original) {
      setRows((r) => r.map((r2, i) => i === index ? fromDelivery(original) : r2))
    } else {
      updateRow(index, { editing: false, error: "" })
    }
  }

  async function saveRow(index: number) {
    const row = rows[index]
    const parsed = parseMonthYear(row.monthYear)
    const qty = Number(row.quantity)
    if (!row.unitType.trim() || !parsed || !Number.isInteger(qty) || qty <= 0) {
      updateRow(index, { error: "All fields are required and quantity must be positive." })
      return
    }
    updateRow(index, { saving: true, error: "" })
    const payload = { unitType: row.unitType.trim(), quantity: qty, deliveryMonth: parsed.month, deliveryYear: parsed.year }
    const url = row.id
      ? `/api/opportunities/${opportunityId}/deliveries/${row.id}`
      : `/api/opportunities/${opportunityId}/deliveries`
    try {
      const res = await fetch(url, {
        method: row.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      if (res.ok) {
        onRefresh()
      } else {
        const d = await res.json().catch(() => ({}))
        updateRow(index, { saving: false, error: d.error ?? "Failed to save." })
      }
    } catch {
      updateRow(index, { saving: false, error: "Network error." })
    }
  }

  async function deleteRow(index: number) {
    const row = rows[index]
    if (!row.id) { cancelRow(index); return }
    if (!window.confirm("Delete this delivery plan and any recorded deliveries and delivery notes?")) return
    updateRow(index, { saving: true, error: "" })
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/deliveries/${row.id}`, { method: "DELETE" })
      if (res.ok) {
        onRefresh()
      } else {
        const d = await res.json().catch(() => ({}))
        updateRow(index, { saving: false, error: d.error ?? "Failed to delete." })
      }
    } catch {
      updateRow(index, { saving: false, error: "Network error." })
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Deliveries</h2>
        {!isReadOnly && (
          <button type="button" onClick={() => setRows((r) => [...r, makeNewRow()])}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-500/10 dark:text-blue-300 rounded-lg transition-colors">
            <Plus size={13} />Add planned delivery
          </button>
        )}
      </div>
      <div className="divide-y divide-gray-200 border-t border-gray-200 dark:divide-slate-700/70">
        {isReadOnly && deliveries.length === 0 && <p className="px-4 py-3 text-xs text-gray-600 dark:text-slate-400">No planned deliveries.</p>}
        {rows.map((row, i) => {
          const delivery = deliveries.find((item) => item.id === row.id)
          if (!isReadOnly && row.editing) {
            return <DeliveryEditRow key={row.id ?? `new-${i}`} row={row} delivered={deliveredQuantity(delivery?.shipments ?? [])}
              onChange={(patch) => updateRow(i, patch)}
              onSave={() => saveRow(i)}
              onCancel={() => cancelRow(i)} />
          }
          if (delivery) {
            return <DeliveryViewRow key={delivery.id} row={row} delivery={delivery} opportunityId={opportunityId}
              onRefresh={onRefresh}
              onEdit={() => updateRow(i, { editing: true })}
              onDelete={() => deleteRow(i)}
              isReadOnly={isReadOnly} isAdmin={isAdmin} />
          }
          return null
        })}
      </div>
    </section>
  )
}
