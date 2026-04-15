"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquarePlus, Cpu, ChevronDown, ChevronUp } from "lucide-react"
import { timeAgo } from "@/lib/utils"
import { Button } from "@/components/ui/button"

export interface LogEntry {
  id: string
  content: string
  system: boolean
  createdAt: Date | string
  author: { id: string; name: string } | null
}

interface LogSectionProps {
  opportunityId: string
  entries: LogEntry[]
  currentUser: { id: string; name: string }
  onRefresh?: () => void
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function LogSection({
  opportunityId,
  entries,
  currentUser,
  onRefresh,
}: LogSectionProps) {
  const router = useRouter()
  const [showSystem, setShowSystem] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [content, setContent] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const userEntries = entries.filter((e) => !e.system)
  const visible = showSystem ? entries : userEntries

  async function handleSubmit() {
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
    setShowForm(false)
    onRefresh?.()
    router.refresh()
  }

  return (
    <div className="mt-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900">
          Log{" "}
          <span className="text-gray-400 font-normal">({userEntries.length})</span>
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSystem((v) => !v)}
            className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded hover:bg-gray-100"
          >
            <Cpu size={13} />
            {showSystem ? "Hide system" : "Show system"}
            {!showSystem && entries.some((e) => e.system) && (
              <span className="ml-0.5 bg-gray-200 text-gray-500 rounded-full px-1.5 py-px text-xs">
                {entries.filter((e) => e.system).length}
              </span>
            )}
          </button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setShowForm((v) => !v)}
          >
            <MessageSquarePlus size={13} className="mr-1.5" />
            Add comment
          </Button>
        </div>
      </div>

      {/* Add comment form */}
      {showForm && (
        <div className="mb-5 p-4 border border-gray-200 rounded-xl bg-gray-50 space-y-3">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Write a comment…"
            rows={3}
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit()
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-400 resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
          />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={handleSubmit} disabled={submitting || !content.trim()}>
              {submitting ? "Posting…" : "Post"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <span className="text-xs text-gray-400 ml-auto">Ctrl+Enter</span>
          </div>
        </div>
      )}

      {/* Entries */}
      <div className="space-y-4">
        {visible.length === 0 && (
          <p className="text-sm text-gray-400 py-2">No log entries yet.</p>
        )}
        {visible.map((entry) =>
          entry.system ? (
            <SystemEntry key={entry.id} entry={entry} />
          ) : (
            <UserEntry key={entry.id} entry={entry} />
          )
        )}
      </div>
    </div>
  )
}

function UserEntry({ entry }: { entry: LogEntry }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
        <span className="text-xs font-semibold text-gray-600">
          {entry.author ? initials(entry.author.name) : "?"}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 mb-1">
          <span className="text-sm font-medium text-gray-900">
            {entry.author?.name ?? "Unknown"}
          </span>
          <span className="text-xs text-gray-400">{timeAgo(entry.createdAt)}</span>
        </div>
        <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
      </div>
    </div>
  )
}

function SystemEntry({ entry }: { entry: LogEntry }) {
  return (
    <div className="flex items-start gap-2 pl-1">
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center mt-0.5">
        <Cpu size={11} className="text-gray-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 italic">{entry.content}</p>
        <p className="text-xs text-gray-300 mt-0.5">{timeAgo(entry.createdAt)}</p>
      </div>
    </div>
  )
}
