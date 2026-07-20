"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/shared/lib/utils"

type NotificationLevel = "NONE" | "STATUS_CHANGES" | "ALL"

const LEVEL_OPTIONS: { value: NotificationLevel; label: string }[] = [
  { value: "NONE", label: "Off" },
  { value: "STATUS_CHANGES", label: "Status changes only" },
  { value: "ALL", label: "All updates" },
]

function NotificationSelect({
  id,
  value,
  disabled,
  onChange,
}: {
  readonly id: string
  readonly value: NotificationLevel
  readonly disabled: boolean
  readonly onChange: (v: NotificationLevel) => void
}) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value as NotificationLevel)}
      className="rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-gray-100 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-60"
    >
      {LEVEL_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>{opt.label}</option>
      ))}
    </select>
  )
}

export function ProfileClient({
  userName: initialName,
  userEmail,
  opportunityNotifications: initialOppNotif,
  adhocNotifications: initialAdhocNotif,
  notificationsAvailable,
}: {
  readonly userName: string
  readonly userEmail: string
  readonly opportunityNotifications: NotificationLevel
  readonly adhocNotifications: NotificationLevel
  readonly notificationsAvailable: boolean
}) {
  const [name, setName] = useState(initialName)
  const [nameSaving, setNameSaving] = useState(false)
  const [nameMsg, setNameMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function saveName(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return
    setNameSaving(true)
    setNameMsg(null)
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    })
    setNameSaving(false)
    setNameMsg(res.ok ? { ok: true, text: "Display name updated." } : { ok: false, text: "Failed to save." })
  }

  const [oppNotif, setOppNotif] = useState<NotificationLevel>(initialOppNotif)
  const [adhocNotif, setAdhocNotif] = useState<NotificationLevel>(initialAdhocNotif)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifMsg, setNotifMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function saveNotification(field: "opportunityNotifications" | "adhocNotifications", value: NotificationLevel) {
    if (field === "opportunityNotifications") setOppNotif(value)
    else setAdhocNotif(value)
    setNotifSaving(true)
    setNotifMsg(null)
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    })
    setNotifSaving(false)
    setNotifMsg(res.ok ? { ok: true, text: "Preference saved." } : { ok: false, text: "Failed to save." })
  }

  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setSuccess("")
    setError("")
  }

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSuccess("")

    if (form.newPassword !== form.confirmPassword) {
      setError("New passwords do not match.")
      return
    }
    if (form.newPassword.length < 8) {
      setError("New password must be at least 8 characters.")
      return
    }

    setSaving(true)
    const res = await fetch("/api/profile/password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword: form.currentPassword, newPassword: form.newPassword }),
    })
    setSaving(false)

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setError(data.error ?? "Failed to change password.")
      return
    }

    setSuccess("Password changed successfully.")
    setForm({ currentPassword: "", newPassword: "", confirmPassword: "" })
  }

  const cardCls = "bg-gray-800 border border-gray-700 rounded-xl p-6"

  return (
    <div className="space-y-6 max-w-md">
      {/* Account */}
      <div className={cardCls}>
        <h2 className="text-base font-semibold text-gray-100 mb-1">Account</h2>
        <p className="text-sm text-gray-400">
          Signed in as <span className="font-medium text-gray-300">{userEmail}</span>
        </p>
      </div>

      {/* Display Name */}
      <div className={cardCls}>
        <h2 className="text-base font-semibold text-gray-100 mb-1">Display Name</h2>
        <p className="text-sm text-gray-400 mb-4">
          Shown in comments, logs, and document uploads.
        </p>
        <form onSubmit={saveName} className="flex gap-2">
          <Input
            id="display-name"
            value={name}
            onChange={(e) => { setName(e.target.value); setNameMsg(null) }}
            placeholder="Your name"
            maxLength={100}
            required
            className="flex-1"
          />
          <Button type="submit" disabled={nameSaving || !name.trim() || name.trim() === initialName}>
            {nameSaving ? "Saving…" : "Save"}
          </Button>
        </form>
        {nameMsg && (
          <p className={cn("text-xs mt-2", nameMsg.ok ? "text-green-600" : "text-red-600")}>{nameMsg.text}</p>
        )}
      </div>

      {/* Email notifications */}
      {notificationsAvailable && (
        <div className={cardCls}>
          <h2 className="text-base font-semibold text-gray-100 mb-1">Email Notifications</h2>
          <p className="text-sm text-gray-400 mb-4">
            Choose when to receive email notifications for each module.
          </p>
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="notif-opp" className="text-gray-300 text-sm">Opportunities</Label>
              <NotificationSelect
                id="notif-opp"
                value={oppNotif}
                disabled={notifSaving}
                onChange={(v) => saveNotification("opportunityNotifications", v)}
              />
            </div>
            <div className="flex items-center justify-between gap-4">
              <Label htmlFor="notif-adhoc" className="text-gray-300 text-sm">Ad hoc work packages</Label>
              <NotificationSelect
                id="notif-adhoc"
                value={adhocNotif}
                disabled={notifSaving}
                onChange={(v) => saveNotification("adhocNotifications", v)}
              />
            </div>
          </div>
          {notifMsg && (
            <p className={cn("text-xs mt-3", notifMsg.ok ? "text-green-500" : "text-red-400")}>{notifMsg.text}</p>
          )}
        </div>
      )}

      {/* Change Password */}
      <div className={cardCls}>
        <h2 className="text-base font-semibold text-gray-100 mb-5">Change Password</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="current">Current Password *</Label>
            <Input id="current" type="password" value={form.currentPassword} onChange={(e) => set("currentPassword", e.target.value)} required autoComplete="current-password" />
          </div>
          <div>
            <Label htmlFor="new">New Password *</Label>
            <Input id="new" type="password" value={form.newPassword} onChange={(e) => set("newPassword", e.target.value)} required minLength={8} autoComplete="new-password" placeholder="Minimum 8 characters" />
          </div>
          <div>
            <Label htmlFor="confirm">Confirm New Password *</Label>
            <Input id="confirm" type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} required autoComplete="new-password" />
          </div>
          {error && <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{error}</div>}
          {success && <div className="text-sm text-green-400 bg-green-900/20 border border-green-800 rounded-lg px-3 py-2">{success}</div>}
          <Button type="submit" disabled={saving}>{saving ? "Changing…" : "Change Password"}</Button>
        </form>
      </div>
    </div>
  )
}
