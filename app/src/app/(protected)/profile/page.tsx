"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function ProfilePage() {
  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState("")
  const [error, setError] = useState("")

  function set(field: string, value: string) {
    setForm((p) => ({ ...p, [field]: value }))
    setSuccess("")
    setError("")
  }

  async function handleSubmit(e: React.FormEvent) {
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
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account settings</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 max-w-md">
        <h2 className="text-base font-semibold text-gray-900 mb-5">Change Password</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="current">Current Password *</Label>
            <Input
              id="current"
              type="password"
              value={form.currentPassword}
              onChange={(e) => set("currentPassword", e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <div>
            <Label htmlFor="new">New Password *</Label>
            <Input
              id="new"
              type="password"
              value={form.newPassword}
              onChange={(e) => set("newPassword", e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Minimum 8 characters"
            />
          </div>

          <div>
            <Label htmlFor="confirm">Confirm New Password *</Label>
            <Input
              id="confirm"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => set("confirmPassword", e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {success && (
            <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              {success}
            </div>
          )}

          <Button type="submit" disabled={saving}>
            {saving ? "Changing…" : "Change Password"}
          </Button>
        </form>
      </div>
    </div>
  )
}
