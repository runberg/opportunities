"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { Send } from "lucide-react"
import { cn } from "@/shared/lib/utils"

const DEFAULT_SUBJECT = "Opportunity update: {{title}}"
const DEFAULT_BODY = `An opportunity has been updated:

{{title}}{{internalId}}
Customer: {{customer}}
Status: {{status}}

{{link}}`

const PLACEHOLDERS = [
  { token: "{{title}}", desc: "Opportunity title" },
  { token: "{{internalId}}", desc: "Internal ID (blank if not set, prefixed with \" · \")" },
  { token: "{{customer}}", desc: "Customer name" },
  { token: "{{status}}", desc: "New status label" },
  { token: "{{link}}", desc: "Link to the application" },
]

interface SmtpForm {
  host: string
  port: number
  secure: boolean
  username: string
  password: string
  fromAddress: string
  fromName: string
  enabled: boolean
  notificationSubject: string
  notificationBody: string
}

interface InitialConfig {
  readonly host: string
  readonly port: number
  readonly secure: boolean
  readonly username: string
  readonly fromAddress: string
  readonly fromName: string
  readonly hasPassword: boolean
  readonly enabled: boolean
  readonly notificationSubject: string
  readonly notificationBody: string
}

export function SmtpClient({ initial }: { readonly initial: InitialConfig | null }) {
  const router = useRouter()

  const [form, setForm] = useState<SmtpForm>({
    host: initial?.host ?? "",
    port: initial?.port ?? 587,
    secure: initial?.secure ?? false,
    username: initial?.username ?? "",
    password: "",
    fromAddress: initial?.fromAddress ?? "",
    fromName: initial?.fromName ?? "Opportunities",
    enabled: initial?.enabled ?? false,
    notificationSubject: initial?.notificationSubject ?? "",
    notificationBody: initial?.notificationBody ?? "",
  })
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [testTo, setTestTo] = useState("")
  const [testing, setTesting] = useState(false)
  const [testMsg, setTestMsg] = useState<{ ok: boolean; text: string } | null>(null)

  function set<K extends keyof SmtpForm>(field: K, value: SmtpForm[K]) {
    setForm((p) => ({ ...p, [field]: value }))
    setSaveMsg(null)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSaveMsg(null)

    const res = await fetch("/api/admin/smtp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, port: Number(form.port) }),
    })

    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSaveMsg({ ok: false, text: data.error ?? "Failed to save." })
      return
    }

    setSaveMsg({ ok: true, text: "Configuration saved." })
    setForm((p) => ({ ...p, password: "" }))
    router.refresh()
  }

  async function handleTest(e: React.FormEvent) {
    e.preventDefault()
    setTesting(true)
    setTestMsg(null)

    const res = await fetch("/api/admin/smtp/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testTo }),
    })

    setTesting(false)
    const data = await res.json().catch(() => ({}))
    setTestMsg(res.ok ? { ok: true, text: `Test email sent to ${testTo}.` } : { ok: false, text: data.error ?? "Failed to send." })
  }

  const isConfigured = !!initial

  return (
    <div className="space-y-6 max-w-lg">
      {/* Master enable toggle */}
      <div className={cn(
        "border rounded-xl p-5 flex items-center justify-between gap-4",
        form.enabled ? "bg-green-50 border-green-200" : "bg-white border-gray-200"
      )}>
        <div>
          <p className="text-sm font-semibold text-gray-900">Email Notifications</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {form.enabled ? "Enabled — notifications will be sent on status changes." : "Disabled — no notifications are sent."}
          </p>
          {!isConfigured && (
            <p className="text-xs text-amber-600 mt-1">Save SMTP settings before enabling.</p>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={form.enabled}
          disabled={!isConfigured}
          onClick={() => set("enabled", !form.enabled)}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-40",
            form.enabled ? "bg-green-500" : "bg-gray-300"
          )}
        >
          <span className={cn("inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform", form.enabled ? "translate-x-6" : "translate-x-1")} />
        </button>
      </div>

      {/* SMTP settings */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-5">SMTP Settings</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 sm:col-span-1">
              <Label htmlFor="smtp-host">Host *</Label>
              <Input id="smtp-host" value={form.host} onChange={(e) => set("host", e.target.value)} placeholder="smtp.example.com" required />
            </div>
            <div>
              <Label htmlFor="smtp-port">Port *</Label>
              <Input id="smtp-port" type="number" value={form.port} onChange={(e) => set("port", Number.parseInt(e.target.value, 10) || 587)} min={1} max={65535} required />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input id="smtp-secure" type="checkbox" checked={form.secure} onChange={(e) => set("secure", e.target.checked)} className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
            <label htmlFor="smtp-secure" className="text-sm text-gray-700">Use TLS (port 465 typically)</label>
          </div>

          <div>
            <Label htmlFor="smtp-user">Username *</Label>
            <Input id="smtp-user" value={form.username} onChange={(e) => set("username", e.target.value)} placeholder="user@example.com" autoComplete="off" required />
          </div>

          <div>
            <Label htmlFor="smtp-pass">
              Password{" "}
              {initial?.hasPassword && <span className="font-normal text-gray-400">(leave blank to keep current)</span>}
            </Label>
            <Input id="smtp-pass" type="password" value={form.password} onChange={(e) => set("password", e.target.value)} autoComplete="new-password" required={!initial?.hasPassword} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="smtp-from-addr">From Address *</Label>
              <Input id="smtp-from-addr" type="email" value={form.fromAddress} onChange={(e) => set("fromAddress", e.target.value)} placeholder="noreply@example.com" required />
            </div>
            <div>
              <Label htmlFor="smtp-from-name">From Name *</Label>
              <Input id="smtp-from-name" value={form.fromName} onChange={(e) => set("fromName", e.target.value)} placeholder="Opportunities" required />
            </div>
          </div>

          {/* Notification template */}
          <div className="pt-2 border-t border-gray-100">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">Notification Template</h3>

            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200 text-xs text-gray-500 space-y-1">
              <p className="font-medium text-gray-600 mb-1.5">Available placeholders:</p>
              {PLACEHOLDERS.map(({ token, desc }) => (
                <div key={token} className="flex gap-2">
                  <code className="text-blue-600 font-mono shrink-0">{token}</code>
                  <span>{desc}</span>
                </div>
              ))}
            </div>

            <div className="space-y-3">
              <div>
                <Label htmlFor="notif-subject">Subject</Label>
                <Input
                  id="notif-subject"
                  value={form.notificationSubject}
                  onChange={(e) => set("notificationSubject", e.target.value)}
                  placeholder={DEFAULT_SUBJECT}
                />
              </div>
              <div>
                <Label htmlFor="notif-body">Body</Label>
                <textarea
                  id="notif-body"
                  value={form.notificationBody}
                  onChange={(e) => set("notificationBody", e.target.value)}
                  placeholder={DEFAULT_BODY}
                  rows={8}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 resize-y"
                />
                <p className="text-xs text-gray-400 mt-1">Leave blank to use the default template.</p>
              </div>
            </div>
          </div>

          {saveMsg && (
            <div className={cn("text-sm px-3 py-2 rounded-lg border", saveMsg.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600")}>
              {saveMsg.text}
            </div>
          )}

          <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save Settings"}</Button>
        </form>
      </div>

      {/* Test email */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">Send Test Email</h2>
        <p className="text-sm text-gray-500 mb-4">Verify your SMTP settings are working.</p>
        <form onSubmit={handleTest} className="space-y-3">
          <div>
            <Label htmlFor="test-to">Recipient Email *</Label>
            <Input id="test-to" type="email" value={testTo} onChange={(e) => { setTestTo(e.target.value); setTestMsg(null) }} placeholder="you@example.com" required />
          </div>
          {testMsg && (
            <div className={cn("text-sm px-3 py-2 rounded-lg border", testMsg.ok ? "bg-green-50 border-green-200 text-green-700" : "bg-red-50 border-red-200 text-red-600")}>
              {testMsg.text}
            </div>
          )}
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={testing || !isConfigured}>
              <Send size={14} className="mr-1.5" />
              {testing ? "Sending…" : "Send Test Email"}
            </Button>
            {!isConfigured && <p className="text-xs text-gray-400">Save SMTP settings first.</p>}
          </div>
        </form>
      </div>
    </div>
  )
}
