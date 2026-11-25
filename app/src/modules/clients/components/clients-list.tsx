"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Fragment, useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { ClientForm, CommunicationForm } from "./client-forms"
import type { WorkKind } from "../validation"

export type WorkPreset = { kind: WorkKind; workId: string }

export function ClientsList({
  clients, canWrite, preset,
}: {
  readonly clients: { id: string; codeName: string; name?: string }[]
  readonly canWrite: boolean
  readonly preset?: WorkPreset
}) {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [creating, setCreating] = useState(false)
  const [loggingClientId, setLoggingClientId] = useState<string | null>(null)
  const match = query.trim().toLowerCase()
  const visible = clients.filter((client) => [client.codeName, client.name].some((value) => value?.toLowerCase().includes(match)))
  const suffix = preset ? `?${new URLSearchParams(preset)}` : ""

  return (
    <div className="mx-auto w-full max-w-4xl space-y-5">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold text-gray-900">{preset ? "Choose a client" : "Clients"}</h1>
        {canWrite && !creating && <Button onClick={() => setCreating(true)}>Add client</Button>}
      </header>
      {creating && (
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">New client</h2>
          <ClientForm onCancel={() => setCreating(false)} onSaved={(id) => router.push(`/clients/${id}${suffix}`)} />
        </section>
      )}
      <Input value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search clients"
        placeholder={canWrite ? "Search by code name or real name" : "Search by code name"} />
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-500">
            <tr>
              <th scope="col" className="px-5 py-2.5">Code name</th>
              {canWrite && <th scope="col" className="px-5 py-2.5">Client name</th>}
              {canWrite && !preset && <th scope="col" className="px-5 py-2.5 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {visible.length === 0 && (
              <tr><td colSpan={canWrite ? (preset ? 2 : 3) : 1} className="px-5 py-4 text-gray-500">
                {clients.length ? "No matching clients." : "No clients yet."}
              </td></tr>
            )}
            {visible.map((client) => {
              const href = `/clients/${client.id}${suffix}`
              const logging = canWrite && !preset && loggingClientId === client.id
              return (
                <Fragment key={client.id}>
                  <tr>
                    <th scope="row" className="px-5 py-3 font-medium">
                      <Link href={href} title={client.name} className="text-blue-700 hover:underline">{client.codeName}</Link>
                    </th>
                    {canWrite && <td className="px-5 py-3 text-gray-600">{client.name}</td>}
                    {canWrite && !preset && (
                      <td className="px-5 py-2 text-right">
                        {!logging && <Button variant="outline" size="sm" className="whitespace-nowrap"
                          aria-label={`Log communication for ${client.codeName}`}
                          onClick={() => setLoggingClientId(client.id)}>Log communication</Button>}
                      </td>
                    )}
                  </tr>
                  {logging && (
                    <tr><td colSpan={3} className="px-5 py-3">
                      <CommunicationForm clientId={client.id}
                        onCancel={() => setLoggingClientId((active) => active === client.id ? null : active)} />
                    </td></tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
