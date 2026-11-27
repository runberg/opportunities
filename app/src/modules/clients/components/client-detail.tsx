"use client"

import { Panel } from "@/shared/components/ui/panel"
import { PageHeader } from "@/shared/components/layout/page-header"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { OpportunityModal } from "@/modules/opportunities/components/opportunity-modal"
import { DeliverableModal } from "@/modules/adhoc/components/deliverable-modal"
import { useState } from "react"
import { ActivitySourceLabel, type ActivitySource } from "@/shared/components/ui/log-section"
import { Button } from "@/shared/components/ui/button"
import { formatDateTime } from "@/shared/lib/utils"
import type { WorkKind } from "../validation"
import type { WorkPreset } from "./clients-list"
import { ClientForm, clientRequest, CommunicationForm } from "./client-forms"
import { WorkPicker } from "./work-picker"

export type LinkedWork = {
  id: string; kind: WorkKind; title: string; internalId: string | null; href: string; canUnlink: boolean; archived: boolean
}

type ClientActivityItem = {
  id: string
  content: string
  date: string
  authorName: string | null
  source: ActivitySource
  context?: string
}

type Details = {
  id: string; codeName: string
  name?: string; description?: string
  communications: { id: string; communicatedAt: string; channel: string; recipient: string; summary: string; author: { name: string } }[]
}

export function ClientDetail({
  client, work, workComments, writableKinds, isAdmin, canWrite, preset, openWork, workAccess,
}: {
  readonly client: Details
  readonly work: LinkedWork[]
  readonly workComments: ClientActivityItem[]
  readonly writableKinds: WorkKind[]
  readonly isAdmin: boolean
  readonly canWrite: boolean
  readonly preset?: WorkPreset
  readonly openWork?: LinkedWork
  readonly workAccess: Record<WorkKind, boolean>
}) {
  const router = useRouter()
  const closeWork = () => router.replace(`/clients/${client.id}`, { scroll: false })
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
  const communications: ClientActivityItem[] = client.communications.map((entry) => ({
    id: `client-communication-${entry.id}`,
    content: entry.summary,
    date: entry.communicatedAt,
    authorName: entry.author.name,
    source: { label: "Client communication" },
    context: `${entry.channel} · ${entry.recipient}`,
  }))
  const activity = [...communications, ...workComments].sort(
    (first, second) => Date.parse(second.date) - Date.parse(first.date),
  )

  return (
    <div className="space-y-4">
      <PageHeader title={client.codeName} titleHint={client.name} className="mb-0"
        actions={<Link href="/clients" className="text-sm text-blue-700 hover:underline">← Clients</Link>} />
      {canWrite && (
        <Panel className="space-y-4 p-5">
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
        </Panel>
      )}

      <Panel className="space-y-4 p-5">
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
                  <Link href={item.href} scroll={false} className="font-medium text-blue-700 hover:underline">{item.title}</Link>
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
      </Panel>

      <Panel id="communications" className="scroll-mt-20 space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h2 className="text-lg font-semibold">Communications</h2>
          {canWrite && !addingNote && <Button onClick={() => setAddingNote(true)}>Log communication</Button>}
        </div>
        {canWrite && addingNote && <CommunicationForm clientId={client.id} onCancel={() => setAddingNote(false)} />}
        {activity.length ? (
          <ul className="divide-y divide-gray-100">
            {activity.map((entry) => (
              <li key={entry.id} className="space-y-1 py-3 text-sm">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <ActivitySourceLabel source={entry.source} />
                  <p className="text-xs text-gray-500">
                    <time dateTime={entry.date} suppressHydrationWarning>{formatDateTime(entry.date)}</time>
                    {entry.authorName && ` · ${entry.authorName}`}
                  </p>
                </div>
                {entry.context && <p className="font-medium">{entry.context}</p>}
                <p className="whitespace-pre-wrap break-words text-gray-700">{entry.content}</p>
              </li>
            ))}
          </ul>
        ) : <p className="text-sm text-gray-500">No communications or linked work comments to show.</p>}
      </Panel>

      {openWork?.kind === "opportunities" && (
        <OpportunityModal opportunityId={openWork.id} isAdmin={isAdmin} isReadOnly={!workAccess.opportunities} onClose={closeWork} />
      )}
      {openWork?.kind === "adhoc" && (
        <DeliverableModal key={openWork.id} deliverableId={openWork.id} isAdmin={isAdmin}
          isReadOnly={!workAccess.adhoc} onClose={closeWork} onRefresh={async () => router.refresh()} />
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
