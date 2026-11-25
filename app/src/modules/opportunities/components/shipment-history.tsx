"use client"

import { useState } from "react"
import { ChevronRight } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { FileDropZone } from "@/shared/components/ui/file-drop-zone"
import { FileTypeIcon } from "@/shared/components/ui/file-type-icon"
import { FileViewerModals } from "@/shared/components/ui/file-viewer-modals"
import { Input } from "@/shared/components/ui/input"
import { DELIVERY_NOTE_MIMES } from "@/shared/lib/file-types"
import { useFileViewer } from "@/shared/lib/use-file-viewer"
import { todayISO } from "@/shared/lib/utils"
import type { DeliveryLine } from "../deliveries/types"

const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" })
const accept = ".pdf,.docx,.xls,.xlsx"

type Shipment = DeliveryLine["shipments"][number]

function ShipmentForm({ endpoint, remaining, shipment, onClose, onSaved }: {
  readonly endpoint: string
  readonly remaining?: number
  readonly shipment?: Shipment
  readonly onClose: () => void
  readonly onSaved: () => void
}) {
  const attachOnly = remaining === undefined
  const [file, setFile] = useState<File | null>(null)
  const [dragging, setDragging] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  function selectFile(next: File) {
    if (!DELIVERY_NOTE_MIMES.has(next.type)) {
      setError("Choose a PDF, Word (.docx), or Excel delivery note.")
      return
    }
    setFile(next)
    setError("")
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    if (file) form.set("file", file)
    setSaving(true)
    setError("")
    try {
      const response = await fetch(endpoint, { method: attachOnly || shipment ? "PATCH" : "POST", body: form })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        setError(result.error ?? "Could not save the delivery.")
        return
      }
      onSaved()
    } catch {
      setError("Could not reach the portal. Check the shipment history before retrying.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="mt-2 space-y-3 rounded-lg border border-gray-200 bg-white p-3 text-sm">
      <fieldset disabled={saving} className="space-y-3">
        {!attachOnly && (
          <>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="block text-xs font-medium text-gray-700">
                Quantity delivered
                <Input name="quantity" type="number" min={1} max={remaining} step={1} defaultValue={shipment?.quantity ?? remaining}
                  className="mt-1" required />
              </label>
              <label className="block text-xs font-medium text-gray-700">
                Delivery date
                <Input name="deliveredOn" type="date" defaultValue={shipment?.deliveredOn.slice(0, 10) ?? todayISO()} className="mt-1" required />
              </label>
            </div>
            <label className="block text-xs font-medium text-gray-700">
              Comment (optional)
              <textarea name="comment" defaultValue={shipment?.comment ?? ""} rows={2} maxLength={500}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" />
            </label>
          </>
        )}
        {!shipment && <div>
          <p className="mb-1 text-xs font-medium text-gray-700">Delivery note{!attachOnly && " (optional)"}</p>
          <FileDropZone file={file} accept={accept} compact dragging={dragging} onFile={selectFile}
            onDragOver={(event) => { event.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault()
              setDragging(false)
              if (event.dataTransfer.files[0]) selectFile(event.dataTransfer.files[0])
            }} />
          {file && <Button variant="ghost" size="sm" onClick={() => setFile(null)}>Remove selected file</Button>}
        </div>}
      </fieldset>
      {error && <p role="alert" className="text-xs text-red-700">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={saving || (attachOnly && !file)}>
          {saving ? "Saving…" : attachOnly ? "Attach note" : "Save shipment"}
        </Button>
        <Button variant="ghost" size="sm" disabled={saving} onClick={onClose}>Cancel</Button>
      </div>
    </form>
  )
}

export function ShipmentHistory({ delivery, opportunityId, remaining, isReadOnly, isAdmin, summary, planActions, error, onRefresh }: {
  readonly delivery: DeliveryLine
  readonly opportunityId: string
  readonly remaining: number
  readonly isReadOnly: boolean
  readonly isAdmin: boolean
  readonly summary: React.ReactNode
  readonly planActions: React.ReactNode
  readonly error: string
  readonly onRefresh: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const [form, setForm] = useState<{ shipmentId?: string; shipment?: Shipment } | null>(null)
  const viewers = useFileViewer()
  const endpoint = `/api/opportunities/${opportunityId}/deliveries/${delivery.id}/shipments`
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState("")
  const shipmentUrl = (id: string) => `${endpoint}/${id}`
  const noteUrl = (id: string) => `${shipmentUrl(id)}/file`

  async function deleteShipment(id: string) {
    if (!window.confirm("Delete this recorded delivery and any attached delivery note?")) return
    setDeleting(true)
    setDeleteError("")
    try {
      const response = await fetch(shipmentUrl(id), { method: "DELETE" })
      if (!response.ok) {
        const result = await response.json().catch(() => ({}))
        throw new Error(result.error ?? "Could not delete the delivery.")
      }
      onRefresh()
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Could not delete the delivery.")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
        {summary}
        <div className="grid shrink-0 gap-1 sm:w-40">
          {!isReadOnly && (
            <div className="flex min-h-7 items-center justify-end">
              {remaining > 0 && !form && !deleting && (
                <Button size="sm" className="whitespace-nowrap" onClick={() => setForm({})}>Record delivery</Button>
              )}
            </div>
          )}
          <div className="flex min-h-7 items-center justify-end gap-1">
            {delivery.shipments.length > 0 && (
              <button type="button" aria-expanded={expanded} aria-controls={`shipments-${delivery.id}`}
                className="inline-flex items-center gap-1 rounded px-2 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:text-slate-300 dark:hover:bg-slate-700/60"
                onClick={() => setExpanded(!expanded)}>
                <ChevronRight size={13} className={expanded ? "rotate-90" : undefined} />
                Shipments ({delivery.shipments.length})
              </button>
            )}
            {planActions}
          </div>
        </div>
      </div>
      {expanded && (
        <ul id={`shipments-${delivery.id}`} className="divide-y divide-gray-200 border-t border-gray-200 bg-gray-50 dark:divide-slate-700/60 px-4 sm:px-6">
          {delivery.shipments.map((shipment) => {
            const { id, quantity, deliveredOn, comment, originalName, mimeType } = shipment
            return (
              <li key={id} className="space-y-1 py-2.5 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <p className="font-medium text-gray-900 dark:text-slate-200">{quantity} delivered <span className="font-normal text-gray-600 dark:text-slate-400">· {dateFormat.format(new Date(deliveredOn))}</span></p>
                  {originalName && mimeType ? (
                    <button type="button" className="inline-flex min-w-0 max-w-full items-center gap-1 text-blue-700 hover:underline dark:text-blue-300"
                      onClick={() => viewers.openViewer({ id, displayName: originalName, mimeType })}>
                      <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center [&_svg]:size-3.5"><FileTypeIcon mimeType={mimeType} /></span>
                      <span className="truncate">{originalName}</span>
                    </button>
                  ) : !isReadOnly && !form && !deleting && (
                    <button type="button" className="text-blue-700 hover:underline dark:text-blue-300" onClick={() => setForm({ shipmentId: id })}>Attach note</button>
                  )}
                  {!isReadOnly && !form && (
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm" disabled={deleting} onClick={() => setForm({ shipmentId: id, shipment })}>Edit delivery</Button>
                      {isAdmin && <Button variant="ghost" size="sm" disabled={deleting} onClick={() => void deleteShipment(id)}>Delete delivery</Button>}
                    </div>
                  )}
                </div>
                {comment && <p className="whitespace-pre-wrap break-words text-gray-600 dark:text-slate-400">{comment}</p>}
              </li>
            )
          })}
        </ul>
      )}
      {!isReadOnly && form && (form.shipmentId || remaining > 0) && (
        <div className="px-4 pb-3">
          <ShipmentForm key={form.shipmentId ?? "new"} endpoint={form.shipment ? shipmentUrl(form.shipment.id) : form.shipmentId ? noteUrl(form.shipmentId) : endpoint}
            shipment={form.shipment} remaining={form.shipment ? remaining + form.shipment.quantity : form.shipmentId ? undefined : remaining}
            onClose={() => setForm(null)} onSaved={() => { setForm(null); setExpanded(true); onRefresh() }} />
        </div>
      )}
      {deleteError && <p role="alert" className="px-4 pb-3 text-xs text-red-700 dark:text-red-300">{deleteError}</p>}
      {error && <p role="alert" className="px-4 pb-3 text-xs text-red-700 dark:text-red-300">{error}</p>}
      <FileViewerModals viewers={viewers} urlFor={noteUrl} />
    </div>
  )
}
