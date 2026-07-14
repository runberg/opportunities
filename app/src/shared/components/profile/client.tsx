"use client"

import { useState } from "react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"
import { Label } from "@/shared/components/ui/label"
import { cn } from "@/shared/lib/utils"

export function ProfileClient({
  userName: initialName,
  userEmail,
  emailNotifications: initialNotifications,
  notificationsAvailable,
}: {
  readonly userName: string
  readonly userEmail: string
  readonly emailNotifications: boolean
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

  const [notifications, setNotifications] = useState(initialNotifications)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifMsg, setNotifMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  async function toggleNotifications(val: boolean) {
    setNotifications(val)
    setNotifSaving(true)
    setNotifMsg(null)
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailNotifications: val }),
    })
    setNotifSaving(false)
    setNotifMsg(res.ok ? { ok: true, text: "Preference saved." } : { ok: false, text: "Failed to save." })
  }

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

      {/* Email notifications — only shown when admin has enabled the feature */}
      {notificationsAvailable && (
        <div className={cardCls}>
          <h2 className="text-base font-semibold text-gray-100 mb-1">Email Notifications</h2>
          <p className="text-sm text-gray-400 mb-4">
            Receive an email when an opportunity changes status.
          </p>
          <div className="flex items-center gap-3">
            <button
              role="switch"
              aria-checked={notifications}
              onClick={() => toggleNotifications(!notifications)}
              disabled={notifSaving}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60",
                notifications ? "bg-blue-600" : "bg-gray-600"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
                  notifications ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
            <span className="text-sm text-gray-300">{notifications ? "Enabled" : "Disabled"}</span>
          </div>
          {notifMsg && (
            <p className={cn("text-xs mt-2", notifMsg.ok ? "text-green-600" : "text-red-600")}>{notifMsg.text}</p>
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
