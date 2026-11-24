"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { formatDateTime } from "@/shared/lib/utils"
import type { WorkKind } from "../validation"
import type { WorkPreset } from "./clients-list"
import { ClientForm, clientRequest, CommunicationForm } from "./client-forms"
import { WorkPicker } from "./work-picker"

export type LinkedWork = {
  id: string; kind: WorkKind; title: string; internalId: string | null; href: string; canUnlink: boolean; archived: boolean
}

type Details = {
  id: string; codeName: string
  name?: string; description?: string
  communications: { id: string; communicatedAt: string; channel: string; recipient: string; summary: string; author: { name: string } }[]
}

export function ClientDetail({
  client, work, writableKinds, isAdmin, canWrite, preset,
}: {
  readonly client: Details
  readonly work: LinkedWork[]
  readonly writableKinds: WorkKind[]
  readonly isAdmin: boolean
  readonly canWrite: boolean
  readonly preset?: WorkPreset
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [addingNote, setAddingNote] = useState(false)
  const [picker, setPicker] = useState<WorkKind | null>(preset?.kind ?? null)
  const [confirm, setConfirm] = useState<"delete" | LinkedWork | null>(null)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  function closePicker() {
    setPicker(null)
    if (preset) router.replace(`/clients/${client.id}`, { scroll: false })
  }

  async function applyConfirmation() {
    if (!confirm) return
    setSaving(true)
    setError("")
    try {
      const endpoint = `/api/clients/${client.id}`
      if (confirm === "delete") {
        await clientRequest(endpoint, "DELETE", {
          codeName: client.codeName, opportunities, adhocPackages: work.length - opportunities,
          communications: client.communications.length,
        })
        router.replace("/clients")
      } else {
        await clientRequest(`${endpoint}/work`, "POST", {
          kind: confirm.kind, workId: confirm.id, expectedClientId: client.id, action: "unlink",
        })
        setConfirm(null)
      }
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not complete the action.")
    } finally {
      setSaving(false)
    }
  }

  const opportunities = work.filter((item) => item.kind === "opportunities").length

  return (
    <div className="max-w-5xl space-y-5">
      <header className="space-y-2">
        <Link href="/clients" className="text-sm text-blue-700 hover:underline">← Clients</Link>
        <h1 className="text-2xl font-semibold text-gray-900">{client.codeName}</h1>
      </header>
      {canWrite && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Details</h2>
            {!editing && <Button onClick={() => setEditing(true)}>Edit details</Button>}
          </div>
          {editing ? (
            <ClientForm client={{ ...client, name: client.name ?? "", description: client.description ?? "" }}
              onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); router.refresh() }} />
          ) : (
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Real name</span> · {client.name}</p>
              <p className="whitespace-pre-wrap break-words text-gray-700">{client.description || "No description."}</p>
            </div>
          )}
        </section>
      )}

      <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-semibold">Linked work</h2>
          {!picker && (
            <div className="flex flex-wrap gap-2">
              {writableKinds.includes("opportunities") && <Button onClick={() => setPicker("opportunities")}>Link opportunity</Button>}
              {writableKinds.includes("adhoc") && <Button onClick={() => setPicker("adhoc")}>Link Ad Hoc package</Button>}
            </div>
          )}
        </div>
        {picker && <WorkPicker key={picker} clientId={client.id} codeName={client.codeName}
          kind={picker} preset={preset?.kind === picker ? preset : undefined} onClose={closePicker} />}
        {work.length ? (
          <ul className="divide-y divide-gray-100">
            {work.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="py-2 flex items-center justify-between gap-4">
                <div className="text-sm">
                  <Link href={item.href} className="font-medium text-blue-700 hover:underline">{item.title}</Link>
                  <p className="mt-1 text-gray-500">
                    {item.kind === "opportunities" ? "Opportunity" : "Ad Hoc package"}
                    {item.internalId && ` · ${item.internalId}`}{item.archived && " · Archived"}
                  </p>
                </div>
                {item.canUnlink && <Button variant="ghost" onClick={() => { setConfirm(item); setError("") }}>Unlink</Button>}
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500">No linked work to show.</p>}
      </section>

      {canWrite && (
        <section className="rounded-xl border border-gray-200 bg-white p-5 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold">Communications</h2>
            {!addingNote && <Button onClick={() => setAddingNote(true)}>Log communication</Button>}
          </div>
          {addingNote && <CommunicationForm clientId={client.id} onCancel={() => setAddingNote(false)} />}
          {client.communications.length ? (
            <ul className="divide-y divide-gray-100">
              {client.communications.map((entry) => (
                <li key={entry.id} className="py-3 space-y-1 text-sm">
                  <p className="font-medium">{entry.channel} · {entry.recipient}</p>
                  <p className="text-xs text-gray-500">
                    <time dateTime={entry.communicatedAt} suppressHydrationWarning>{formatDateTime(entry.communicatedAt)}</time>
                    {" · Logged by "}{entry.author.name}
                  </p>
                  <p className="whitespace-pre-wrap break-words text-gray-700">{entry.summary}</p>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-gray-500">No communications logged yet.</p>}
        </section>
      )}

      {isAdmin && <Button variant="danger" onClick={() => { setConfirm("delete"); setError("") }}>Delete client</Button>}
      {confirm && (
        <section className="rounded-xl border border-red-200 bg-red-50 p-5 space-y-3" aria-label="Confirm change">
          <h2 className="font-semibold">{confirm === "delete" ? `Delete ${client.codeName}?` : `Unlink ${confirm.title}?`}</h2>
          {confirm === "delete" ? (
            <p className="text-sm">
              This permanently deletes the client and {client.communications.length} communications entries.
              The {opportunities} opportunities and {work.length - opportunities} Ad Hoc packages will be kept with {client.codeName} as their customer label.
            </p>
          ) : <p className="text-sm">The work will keep {client.codeName} as its customer label.</p>}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="flex gap-2">
            <Button variant="danger" disabled={saving} onClick={() => void applyConfirmation()}>{confirm === "delete" ? "Delete client permanently" : "Unlink work"}</Button>
            <Button variant="ghost" disabled={saving} onClick={() => setConfirm(null)}>Cancel</Button>
          </div>
        </section>
      )}
    </div>
  )
}
