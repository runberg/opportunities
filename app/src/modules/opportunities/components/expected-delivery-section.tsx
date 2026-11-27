"use client"

import { useEffect, useState } from "react"
import { Check, Lock, Plus, Trash2, X } from "lucide-react"
import { DELIVERY_TYPES, DELIVERY_TYPE_LABELS, MAX_DELIVERY_OFFSET, deliveredQuantity, type DeliveryLine, type DeliveryType, type UnitTypeOption } from "../deliveries/types"
import { useAutoFocus } from "@/shared/lib/use-autofocus"
import { calculateDeliveryDate, deliveryT0 } from "../deliveries/schedule"
import { ShipmentHistory } from "./shipment-history"

interface DeliveryRowState {
  id: string | null  // null = unsaved new row
  unitTypeId: string
  quantity: string
  deliveryType: DeliveryType
  offsetMonths: string
  overrideDate: string
  dirty: boolean
  saving: boolean
  error: string
}

const dayFormat = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })

function dateLabel(date: string) {
  return dayFormat.format(new Date(date))
}

function readOffset(value: string) {
  const offset = Number(value)
  return value.trim() !== "" && Number.isInteger(offset) && offset >= 0 && offset <= MAX_DELIVERY_OFFSET ? offset : null
}

function deliveryMonthLabel(month: number, year: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

function makeNewRow(): DeliveryRowState {
  return {
    id: null,
    unitTypeId: "",
    quantity: "",
    deliveryType: "HANDOVER",
    offsetMonths: "0",
    overrideDate: "",
    dirty: true,
    saving: false,
    error: "",
  }
}

function fromDelivery(d: DeliveryLine): DeliveryRowState {
  return {
    id: d.id,
    unitTypeId: d.unitTypeId,
    quantity: String(d.quantity),
    deliveryType: d.deliveryType,
    offsetMonths: d.offsetMonths === null ? "" : String(d.offsetMonths),
    overrideDate: d.overrideDate?.slice(0, 10) ?? "",
    dirty: false,
    saving: false,
    error: "",
  }
}

function toRows(lines: DeliveryLine[]): DeliveryRowState[] {
  return lines.map(fromDelivery)
}

const fieldClass = "min-w-0 w-full truncate rounded border border-gray-300 bg-gray-50 px-2 py-1.5 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:border-transparent disabled:text-gray-600"
const fieldGrid = "grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,.65fr)_minmax(0,.9fr)_minmax(0,1.9fr)] items-center gap-1 sm:gap-2"
const rowGrid = "grid grid-cols-1 items-center gap-2 px-2 sm:grid-cols-[minmax(0,1fr)_7rem] sm:px-3"

function DeliveryDateField({ date, fallback, locked, readOnly, saving, onChange }: {
  readonly date: string | null
  readonly fallback: string
  readonly locked: boolean
  readonly readOnly: boolean
  readonly saving: boolean
  readonly onChange: (date: string) => void
}) {
  const [editing, setEditing] = useState(false)
  const focusDate = useAutoFocus<HTMLInputElement>()
  const label = date ? dateLabel(date) : fallback

  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_1.5rem] items-center gap-1">
      {readOnly && <span className="truncate px-2 text-sm text-gray-900">{label}</span>}
      {!readOnly && editing && (
        <input type="date" ref={focusDate} aria-label="Override delivery date" className={fieldClass} value={date ?? ""} disabled={saving}
          onChange={(e) => { if (e.target.value) onChange(e.target.value) }}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => { if (e.key === "Escape" || e.key === "Enter") setEditing(false) }} />
      )}
      {!readOnly && !editing && (
        <button type="button" aria-label={"Edit delivery date, " + label} disabled={saving}
          className={fieldClass + " text-left tabular-nums hover:border-blue-500"} onClick={() => setEditing(true)}>
          {label}
        </button>
      )}
      {locked && (readOnly ? (
        <span role="img" aria-label="Date locked" title="Manual date override" className="grid size-6 place-items-center text-blue-600 dark:text-blue-300">
          <Lock size={13} />
        </span>
      ) : (
        <button type="button" aria-label="Date locked. Restore scheduled date" title="Date locked · Click to restore scheduled date" disabled={saving}
          className="grid size-6 place-items-center rounded text-blue-600 hover:bg-gray-100 dark:text-blue-300" onClick={() => onChange("")}>
          <Lock size={13} />
        </button>
      ))}
    </div>
  )
}

function DeliveryFields({ row, delivery, delivered, isReadOnly, t0, unitTypes, onChange }: {
  readonly row: DeliveryRowState
  readonly unitTypes: UnitTypeOption[]
  readonly delivery?: DeliveryLine
  readonly delivered: number
  readonly isReadOnly: boolean
  readonly t0: string
  readonly onChange: (patch: Partial<DeliveryRowState>) => void
}) {
  const offset = readOffset(row.offsetMonths)
  const calculated = offset === null ? null : calculateDeliveryDate(t0, offset)
  const legacyMonth = delivery?.offsetMonths === null && delivery.deliveryMonth && delivery.deliveryYear
    ? deliveryMonthLabel(delivery.deliveryMonth, delivery.deliveryYear)
    : "—"
  const disabled = isReadOnly || row.saving

  return (
    <div className={fieldGrid}>
      <select aria-label="Delivery type" className={fieldClass} value={row.deliveryType} disabled={disabled}
        onChange={(e) => onChange({ deliveryType: e.target.value as DeliveryType })}>
        {DELIVERY_TYPES.map((type) => <option key={type} value={type}>{DELIVERY_TYPE_LABELS[type]}</option>)}
      </select>
      <select aria-label="Product" className={fieldClass} value={row.unitTypeId}
        disabled={disabled || delivered > 0} onChange={(e) => onChange({ unitTypeId: e.target.value })}>
        <option value="" disabled>Select product</option>
        {unitTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
      </select>
      <input type="number" aria-label="Planned quantity" className={fieldClass} min={Math.max(1, delivered)} value={row.quantity}
        placeholder="Qty" disabled={disabled} onChange={(e) => onChange({ quantity: e.target.value })} />
      <input type="number" aria-label="T0 offset in months" className={fieldClass} min={0} max={MAX_DELIVERY_OFFSET} step={1}
        value={row.offsetMonths} placeholder="—" disabled={disabled} onChange={(e) => onChange({ offsetMonths: e.target.value })} />
      <DeliveryDateField date={row.overrideDate || calculated} fallback={legacyMonth} locked={Boolean(row.overrideDate)}
        readOnly={isReadOnly} saving={row.saving} onChange={(overrideDate) => onChange({ overrideDate })} />
    </div>
  )
}

function DeliveryActions({ row, canDelete, onSave, onCancel, onDelete }: {
  readonly row: DeliveryRowState
  readonly canDelete: boolean
  readonly onSave: () => void
  readonly onCancel: () => void
  readonly onDelete: () => void
}) {
  if (row.dirty) {
    return (
      <div className="flex shrink-0 items-center gap-1">
        <button type="button" aria-label="Save delivery plan" title="Save delivery plan" onClick={onSave} disabled={row.saving}
          className="rounded bg-blue-600 p-1.5 text-white hover:bg-blue-700 disabled:opacity-50"><Check size={14} /></button>
        <button type="button" aria-label="Cancel delivery changes" title="Cancel delivery changes" onClick={onCancel} disabled={row.saving}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-100"><X size={14} /></button>
      </div>
    )
  }
  if (!canDelete) return null
  return (
    <button type="button" aria-label="Delete delivery plan" title="Delete delivery plan" onClick={onDelete} disabled={row.saving}
      className="rounded p-1.5 text-gray-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
  )
}

export function ExpectedDeliverySection({ opportunityId, deliveries, unitTypes, advancePaymentDate, canRecordShipments, isReadOnly, isAdmin, onRefresh }: {
  readonly advancePaymentDate: string | null
  readonly canRecordShipments: boolean
  readonly opportunityId: string
  readonly isAdmin: boolean
  readonly deliveries: DeliveryLine[]
  readonly unitTypes: UnitTypeOption[]
  readonly isReadOnly: boolean
  readonly onRefresh: () => void
}) {
  const t0 = deliveryT0(advancePaymentDate)
  const [rows, setRows] = useState<DeliveryRowState[]>(() => toRows(deliveries))

  useEffect(() => {
    setRows((current) => {
      const pending = new Map(current.filter((row) => row.dirty || row.saving).map((row) => [row.id, row]))
      const updated = deliveries.map((delivery) => pending.get(delivery.id) ?? fromDelivery(delivery))
      const draft = pending.get(null)
      return draft ? [...updated, draft] : updated
    })
  }, [deliveries])

  function updateRow(id: string | null, patch: Partial<DeliveryRowState>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...patch } : row))
  }

  function cancelRow(index: number) {
    const row = rows[index]
    if (!row.id) {
      const next = rows.filter((_, i) => i !== index)
      setRows(next)
      return
    }
    const original = deliveries.find((d) => d.id === row.id)
    if (original) {
      setRows((r) => r.map((r2, i) => i === index ? fromDelivery(original) : r2))
    } else {
      updateRow(row.id, { dirty: false, error: "" })
    }
  }

  async function saveRow(index: number) {
    const row = rows[index]
    const offset = readOffset(row.offsetMonths)
    const original = deliveries.find((delivery) => delivery.id === row.id)
    const keepLegacyMonth = original?.offsetMonths === null && row.offsetMonths === ""
    const qty = Number(row.quantity)
    if (!row.unitTypeId || !Number.isInteger(qty) || qty <= 0) {
      updateRow(row.id, { error: "Select a product and enter a positive whole quantity." })
      return
    }
    if (!keepLegacyMonth && offset === null) {
      updateRow(row.id, { error: "Enter a whole month offset between 0 and " + MAX_DELIVERY_OFFSET + "." })
      return
    }
    updateRow(row.id, { saving: true, error: "" })
    const payload = {
      unitTypeId: row.unitTypeId, quantity: qty, deliveryType: row.deliveryType,
      overrideDate: row.overrideDate || null,
      ...(offset !== null && { offsetMonths: offset }),
    }
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
        if (row.id) updateRow(row.id, { dirty: false, saving: false })
        else setRows((current) => current.filter((item) => item.id !== null))
        onRefresh()
      } else {
        const d = await res.json().catch(() => ({}))
        updateRow(row.id, { saving: false, error: d.error ?? "Failed to save." })
      }
    } catch {
      updateRow(row.id, { saving: false, error: "Network error." })
    }
  }

  async function deleteRow(index: number) {
    const row = rows[index]
    if (!row.id) { cancelRow(index); return }
    if (!window.confirm("Delete this delivery plan and any recorded deliveries and delivery notes?")) return
    updateRow(row.id, { saving: true, error: "" })
    try {
      const res = await fetch(`/api/opportunities/${opportunityId}/deliveries/${row.id}`, { method: "DELETE" })
      if (res.ok) {
        setRows((current) => current.filter((item) => item.id !== row.id))
        onRefresh()
      } else {
        const d = await res.json().catch(() => ({}))
        updateRow(row.id, { saving: false, error: d.error ?? "Failed to delete." })
      }
    } catch {
      updateRow(row.id, { saving: false, error: "Network error." })
    }
  }

  return (
    <section className="mt-4 rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-slate-100">Deliveries</h2>
          <p className="text-xs text-gray-500">T0 · {dateLabel(t0)} · {advancePaymentDate ? "Advance payment received" : "Rolling until advance payment"}</p>
        </div>
        {!isReadOnly && (
          <button type="button" disabled={(unitTypes.length === 0 || rows.some((row) => row.id === null))} onClick={() => setRows((r) => [...r, makeNewRow()])}
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-500/10 dark:text-blue-300 rounded-lg transition-colors">
            <Plus size={13} />Add planned delivery
          </button>
        )}
      </div>
      <div className="border-t border-gray-200">
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-xs text-gray-600">{!isReadOnly && unitTypes.length === 0 ? "Products must be added in Admin before planning a delivery." : "No planned deliveries."}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            <div className={rowGrid + " bg-gray-50 py-2 text-[11px] font-medium uppercase tracking-wide text-gray-600"}>
              <div className={fieldGrid}>
                {["Type", "Product", "Qty", "T0 + mo.", "Date"].map((label) => (
                  <span key={label} className="min-w-0 px-1">{label}</span>
                ))}
              </div>
            </div>
            {rows.map((row, i) => {
              const delivery = deliveries.find((item) => item.id === row.id)
              const delivered = deliveredQuantity(delivery?.shipments ?? [])
              const fields = <DeliveryFields row={row} delivery={delivery} delivered={delivered} unitTypes={unitTypes} isReadOnly={isReadOnly} t0={t0}
                onChange={(patch) => updateRow(row.id, { ...patch, dirty: true, error: "" })} />
              const actions = !isReadOnly && <DeliveryActions row={row} canDelete={isAdmin}
                onSave={() => void saveRow(i)} onCancel={() => cancelRow(i)} onDelete={() => void deleteRow(i)} />

              if (!delivery) {
                return (
                  <div key="new">
                    <div className={rowGrid + " py-2"}>{fields}<div className="flex justify-end empty:hidden">{actions}</div></div>
                    {row.error && <p role="alert" className="px-3 pb-2 text-xs text-red-700">{row.error}</p>}
                  </div>
                )
              }
              return (
                <ShipmentHistory key={delivery.id} delivery={delivery} opportunityId={opportunityId}
                  remaining={delivery.quantity - delivered} isReadOnly={isReadOnly || !canRecordShipments || row.dirty}
                  isAdmin={isAdmin} onRefresh={onRefresh} planActions={actions} error={row.error}
                  rowClassName={rowGrid + " py-2"} summary={fields} />
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}
