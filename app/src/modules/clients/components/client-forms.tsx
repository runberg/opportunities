"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Select } from "@/shared/components/ui/select"
import { CHANNELS } from "../validation"

const textareaClass = "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"

export async function clientRequest(url: string, method: string, body?: object) {
  const response = await fetch(url, {
    method,
    ...(body && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  })
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? "The request could not be completed.")
  return data
}

export function ClientForm({
  client, onCancel, onSaved,
}: {
  readonly client?: { id: string; name: string; codeName: string; description: string }
  readonly onCancel: () => void
  readonly onSaved: (id: string) => void
}) {
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const body = Object.fromEntries(new FormData(event.currentTarget))
    setSaving(true)
    setError("")
    try {
      const data = await clientRequest(client ? `/api/clients/${client.id}` : "/api/clients", client ? "PATCH" : "POST", body)
      onSaved(data.id)
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not save the client.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-medium">Real name
        <Input name="name" defaultValue={client?.name} maxLength={160} required />
      </label>
      <label className="block text-sm font-medium">Code name
        <Input name="codeName" defaultValue={client?.codeName} maxLength={80} required />
        <span className="text-xs font-normal text-gray-500">Shown on linked work, in search results and in exports.</span>
      </label>
      <label className="block text-sm font-medium">Description
        <textarea name="description" className={textareaClass} defaultValue={client?.description} maxLength={12000} rows={7} />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save client"}</Button>
        <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}

export function CommunicationForm({ clientId, onCancel }: { readonly clientId: string; readonly onCancel: () => void }) {
  const router = useRouter()
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const date = new Date(String(values.get("communicatedAt")))
    if (Number.isNaN(date.getTime())) {
      setError("Enter the date and time of the communication.")
      return
    }

    setSaving(true)
    setError("")
    try {
      await clientRequest(`/api/clients/${clientId}/communications`, "POST", {
        ...Object.fromEntries(values), communicatedAt: date.toISOString(),
      })
      onCancel()
      router.refresh()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not log the communication.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 border border-gray-200 rounded-lg p-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-medium">Date and time
          <Input name="communicatedAt" type="datetime-local" required />
        </label>
        <label className="block text-sm font-medium">Channel
          <Select name="channel">{CHANNELS.map((option) => <option key={option}>{option}</option>)}</Select>
        </label>
      </div>
      <label className="block text-sm font-medium">Communicated to
        <Input name="recipient" maxLength={300} required />
      </label>
      <label className="block text-sm font-medium">What was said or sent
        <textarea name="summary" className={textareaClass} maxLength={8000} rows={4} required />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save entry"}</Button>
        <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  )
}
