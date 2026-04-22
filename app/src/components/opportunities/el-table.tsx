"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { MessageSquarePlus } from "lucide-react"
import { sortRows, type SortDir } from "@/components/ui/sortable-header"
import { OpportunityDataTable, type OppTableRow } from "@/components/opportunities/opportunity-data-table"
import { OpportunityModal } from "@/components/opportunities/opportunity-modal"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

export interface ELRow extends OppTableRow {
  _count: { comments: number; documents: number }
}

export function ELTable({
  opportunities, currentUserId, isAdmin,
}: {
  opportunities: ELRow[]
  currentUserId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [openModalId, setOpenModalId] = useState<string | null>(null)
  const [commentTarget, setCommentTarget] = useState<ELRow | null>(null)
  const [comment, setComment] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [commentError, setCommentError] = useState("")
  const [sortKey, setSortKey] = useState("elRequestedDate")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => sortRows(opportunities, sortKey, sortDir), [opportunities, sortKey, sortDir])

  async function submitComment() {
    if (!commentTarget || !comment.trim()) return
    setSubmitting(true)
    setCommentError("")
    const res = await fetch(`/api/opportunities/${commentTarget.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: comment.trim() }),
    })
    setSubmitting(false)
    if (!res.ok) {
      setCommentError((await res.json().catch(() => ({}))).error ?? "Failed to save comment.")
      return
    }
    setCommentTarget(null)
    setComment("")
    router.refresh()
  }

  return (
    <>
      <OpportunityDataTable
        rows={sorted}
        emptyMessage="No engagement letters found."
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(k, d) => { setSortKey(k); setSortDir(d) }}
        dateColumn={{ label: "EL Requested", sortKey: "elRequestedDate", getValue: (r) => r.elRequestedDate }}
        onRowClick={setOpenModalId}
        renderAction={(row) => (
          <button
            type="button"
            onClick={() => { setCommentTarget(row as ELRow); setComment(""); setCommentError("") }}
            className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
            title="Add comment"
          >
            <MessageSquarePlus size={16} />
          </button>
        )}
      />

      <OpportunityModal
        opportunityId={openModalId}
        onClose={() => { setOpenModalId(null); router.refresh() }}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />

      <Dialog open={!!commentTarget} onClose={() => setCommentTarget(null)} title="Add Comment">
        {commentTarget && (
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-900">{commentTarget.title}</p>
              {commentTarget.internalId && <p className="text-sm text-gray-500">{commentTarget.internalId}</p>}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment…"
              rows={4}
              autoFocus
              onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitComment() }}
            />
            {commentError && <p className="text-sm text-red-600">{commentError}</p>}
            <div className="flex items-center gap-3">
              <Button onClick={submitComment} disabled={submitting || !comment.trim()}>
                {submitting ? "Saving…" : "Add Comment"}
              </Button>
              <Button variant="ghost" onClick={() => setCommentTarget(null)}>Cancel</Button>
              <span className="text-xs text-gray-400 ml-auto">Ctrl+Enter</span>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
