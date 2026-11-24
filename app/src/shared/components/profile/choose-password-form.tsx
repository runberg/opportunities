"use client"

import { useState } from "react"
import { signIn, signOut } from "next-auth/react"
import { Button } from "@/shared/components/ui/button"
import { Input } from "@/shared/components/ui/input"

export function ChoosePasswordForm({ email, destination }: { readonly email: string; readonly destination: string }) {
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const loginUrl = `/login?callbackUrl=${encodeURIComponent(destination)}`

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const currentPassword = form.get("currentPassword")
    const newPassword = form.get("newPassword")
    if (newPassword !== form.get("confirmPassword")) {
      setError("The new passwords do not match.")
      return
    }

    setSaving(true)
    setError("")
    try {
      const res = await fetch("/api/profile/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data.error ?? "Could not change the password. Try again.")
        return
      }

      try {
        const result = await signIn("credentials", { email, password: newPassword, redirect: false })
        window.location.assign(result?.ok && !result.error ? destination : loginUrl)
      } catch {
        window.location.assign(loginUrl)
      }
    } catch {
      setError("Could not reach the portal. Check your connection and try again.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm text-gray-700">
        Temporary password
        <Input name="currentPassword" type="password" autoComplete="current-password" required />
      </label>
      <label className="block text-sm text-gray-700">
        New password
        <Input name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      <label className="block text-sm text-gray-700">
        Confirm new password
        <Input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>{saving ? "Saving…" : "Save and continue"}</Button>
        <Button type="button" variant="ghost" disabled={saving} onClick={() => void signOut({ callbackUrl: loginUrl })}>Sign out</Button>
      </div>
    </form>
  )
}
