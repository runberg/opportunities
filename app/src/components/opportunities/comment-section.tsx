"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { timeAgo } from "@/lib/utils"

interface Comment {
  id: string
  content: string
  createdAt: Date | string
  author: { id: string; name: string }
}

interface CommentSectionProps {
  opportunityId: string
  comments: Comment[]
  currentUser: { id: string; name: string }
}

export function CommentSection({ opportunityId, comments, currentUser }: CommentSectionProps) {
  const router = useRouter()
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!content.trim()) return

    setSubmitting(true)
    setError("")

    const res = await fetch(`/api/opportunities/${opportunityId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: content.trim() }),
    })

    setSubmitting(false)

    if (!res.ok) {
      setError("Failed to post comment.")
      return
    }

    setContent("")
    router.refresh()
  }

  function initials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase()
  }

  return (
    <div className="mt-10">
      <h2 className="text-base font-semibold text-gray-900 mb-5">
        Comments{" "}
        <span className="text-gray-400 font-normal">({comments.length})</span>
      </h2>

      {/* Comment thread */}
      <div className="space-y-5 mb-6">
        {comments.length === 0 && (
          <p className="text-sm text-gray-400">No comments yet. Be the first to add one.</p>
        )}
        {comments.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs font-semibold text-gray-600">
                {initials(comment.author.name)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm font-medium text-gray-900">{comment.author.name}</span>
                <span className="text-xs text-gray-400">{timeAgo(comment.createdAt)}</span>
              </div>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.content}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add comment */}
      <form onSubmit={handleSubmit} className="border-t border-gray-200 pt-5">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment…"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              handleSubmit(e as unknown as React.FormEvent)
            }
          }}
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-gray-400">Ctrl+Enter to submit</span>
          <button
            type="submit"
            disabled={submitting || !content.trim()}
            className="px-4 py-1.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? "Posting…" : "Post"}
          </button>
        </div>
      </form>
    </div>
  )
}

// Need to import Textarea here
function Textarea({
  value,
  onChange,
  placeholder,
  rows,
  onKeyDown,
}: {
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
  placeholder?: string
  rows?: number
  onKeyDown?: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void
}) {
  return (
    <textarea
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      rows={rows ?? 3}
      onKeyDown={onKeyDown}
      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
    />
  )
}
