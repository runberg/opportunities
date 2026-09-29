"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RefreshCw, Trash2 } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { cn, formatDateTime } from "@/shared/lib/utils"
import type { QueuedEmail } from "@/shared/lib/email-outbox"

type Message = { ok: boolean; text: string }

function statusBadge(email: QueuedEmail): { label: string; cls: string } {
  if (email.status === "FAILED") return { label: "Failed", cls: "bg-red-100 text-red-700" }
  if (email.status === "SENDING") return { label: "Sending", cls: "bg-blue-100 text-blue-700" }
  if (email.attempts > 0) return { label: "Retrying", cls: "bg-amber-100 text-amber-700" }
  return { label: "Queued", cls: "bg-gray-100 text-gray-600" }
}

function retrySummary(result: { sent: number; failed: number }): Message {
  if (result.sent + result.failed === 0) return { ok: true, text: "Nothing to retry." }
  if (result.failed === 0) return { ok: true, text: `${result.sent} sent.` }
  return { ok: false, text: `${result.sent} sent, ${result.failed} still failing — see the error column.` }
}

function EmailRow({ email, busy, onRetry, onDiscard }: {
  readonly email: QueuedEmail
  readonly busy: boolean
  readonly onRetry: (id: string) => void
  readonly onDiscard: (id: string) => void
}) {
  const badge = statusBadge(email)
  const detail = email.status === "PENDING" && email.attempts > 0
    ? `Next try ${formatDateTime(email.nextAttemptAt)}`
    : null
  return (
    <li className="py-3 flex items-start gap-3">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn("inline-flex px-2 py-0.5 text-xs rounded-full font-medium shrink-0", badge.cls)}>{badge.label}</span>
          <p className="text-sm text-gray-900 truncate" title={email.to}>{email.to}</p>
        </div>
        <p className="text-sm text-gray-700 mt-1 break-words">{email.subject}</p>
        <p className="text-xs text-gray-400 mt-0.5">
          {formatDateTime(email.createdAt)} · {email.attempts} attempt{email.attempts === 1 ? "" : "s"}
          {detail && <> · {detail}</>}
        </p>
        {email.lastError && <p className="text-xs text-red-600 mt-1 break-words">{email.lastError}</p>}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {email.status === "FAILED" && (
          <Button size="sm" variant="ghost" onClick={() => onRetry(email.id)} disabled={busy}>Retry</Button>
        )}
        {email.status !== "SENDING" && (
          <button
            type="button"
            onClick={() => onDiscard(email.id)}
            disabled={busy}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors disabled:opacity-40"
            title="Discard — this email will not be sent"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </li>
  )
}

export function EmailQueue({ emails }: { readonly emails: QueuedEmail[] }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<Message | null>(null)
  const failedCount = emails.filter((e) => e.status === "FAILED").length

  async function retry(ids?: string[]) {
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/email-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(ids ? { ids } : {}),
      })
      const data = await res.json().catch(() => ({})) as { sent?: number; failed?: number; error?: string }
      setMessage(res.ok ? retrySummary({ sent: data.sent ?? 0, failed: data.failed ?? 0 }) : { ok: false, text: data.error ?? "Retry failed." })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  async function discard(id: string) {
    if (!confirm("Discard this email? It will not be sent.")) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await fetch("/api/admin/email-queue", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      })
      if (!res.ok) setMessage({ ok: false, text: "Could not discard the email." })
      router.refresh()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
        <h2 className="text-base font-semibold text-gray-900">Email Queue</h2>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" onClick={() => router.refresh()} disabled={busy}>
            <RefreshCw size={13} className="mr-1.5" />
            Refresh
          </Button>
          {failedCount > 0 && (
            <Button size="sm" variant="primary" onClick={() => void retry()} disabled={busy}>
              {busy ? "Working…" : `Retry all failed (${failedCount})`}
            </Button>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Emails that haven&apos;t been sent yet. Failed sends are retried automatically for about a day, then stay
        here as <span className="font-medium text-red-600">Failed</span> until you retry or discard them.
      </p>

      {message && (
        <p className={cn("text-sm mb-3", message.ok ? "text-green-600" : "text-red-600")}>{message.text}</p>
      )}

      {emails.length === 0 ? (
        <p className="text-sm text-gray-400 py-6 text-center">All emails have been sent.</p>
      ) : (
        <ul className="divide-y divide-gray-100 border-t border-gray-100">
          {emails.map((email) => (
            <EmailRow key={email.id} email={email} busy={busy} onRetry={(id) => void retry([id])} onDiscard={(id) => void discard(id)} />
          ))}
        </ul>
      )}
    </div>
  )
}
