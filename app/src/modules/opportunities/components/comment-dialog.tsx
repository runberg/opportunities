"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Dialog } from "@/shared/components/ui/dialog"
import { Button } from "@/shared/components/ui/button"
import { Textarea } from "@/shared/components/ui/textarea"

interface CommentTarget {
  readonly id: string
  readonly title: string
  readonly internalId?: string | null
}

interface CommentDialogProps {
  readonly target: CommentTarget | null
  readonly onClose: () => void
}

export function CommentDialog({ target, onClose }: CommentDialogProps) {
  const router = useRouter()
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function submit() {
    if (!target || !comment.trim()) return
    setSubmitting(true)
    setError("")
    const res = await fetch(`/api/opportunities/${target.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment.trim() }),
    })
    setSubmitting(false)
    if (!res.ok) {
      setError((await res.json().catch(() => ({}))).error ?? "Failed to save comment.")
      return
    }
    setComment("")
    onClose()
    router.refresh()
  }

  function handleClose() {
    setComment("")
    setError("")
    onClose()
  }

  return (
    <Dialog open={!!target} onClose={handleClose} title="Add Comment">
      {target && (
        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900">{target.title}</p>
            {target.internalId && <p className="text-sm text-gray-500">{target.internalId}</p>}
          </div>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Write a comment…"
            rows={4}
            autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit() }}
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <Button onClick={submit} disabled={submitting || !comment.trim()}>
              {submitting ? "Saving…" : "Add Comment"}
            </Button>
            <Button variant="ghost" onClick={handleClose}>Cancel</Button>
            <span className="text-xs text-gray-400 ml-auto">Ctrl+Enter</span>
          </div>
        </div>
      )}
    </Dialog>
  )
}
