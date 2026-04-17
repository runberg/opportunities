"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MessageSquarePlus } from "lucide-react"
import { StatusBadge, PendingBadge } from "@/components/opportunities/status-badge"
import { Dialog } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { OpportunityModal } from "@/components/opportunities/opportunity-modal"

export interface ELRow {
  id: string
  internalId: string | null
  title: string
  customer: string
  reference: string | null
  elRequestedDate: string | null
  product: string | null
  status: string
  waitingOn: string
  _count: { comments: number; documents: number }
}

export function ELTable({
  opportunities,
  currentUserId,
  isAdmin,
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
      const data = await res.json().catch(() => ({}))
      setCommentError(data.error ?? "Failed to save comment.")
      return
    }
    setCommentTarget(null)
    setComment("")
    router.refresh()
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">
                Customer
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">
                Product
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">
                EL Requested
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">
                Pending
              </th>
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {opportunities.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-gray-400">
                  No engagement letters found.
                </td>
              </tr>
            )}
            {opportunities.map((opp) => (
              <tr
                key={opp.id}
                onClick={() => setOpenModalId(opp.id)}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{opp.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {opp.internalId && (
                      <span className="text-xs text-gray-400">{opp.internalId}</span>
                    )}
                    {opp.reference && (
                      <span className="text-xs text-gray-400">{opp.reference}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{opp.customer}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate hidden md:table-cell">
                  {opp.product ?? "—"}
                </td>
                <td className="px-4 py-3 text-gray-500 hidden lg:table-cell">
                  {opp.elRequestedDate ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={opp.status} short />
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <PendingBadge waitingOn={opp.waitingOn} />
                </td>
                <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-1 justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setCommentTarget(opp)
                        setComment("")
                        setCommentError("")
                      }}
                      className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                      title="Add comment"
                    >
                      <MessageSquarePlus size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Opportunity modal */}
      <OpportunityModal
        opportunityId={openModalId}
        onClose={() => { setOpenModalId(null); router.refresh() }}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />

      {/* Quick comment dialog */}
      <Dialog
        open={!!commentTarget}
        onClose={() => setCommentTarget(null)}
        title="Add Comment"
      >
        {commentTarget && (
          <div className="space-y-4">
            <div>
              <p className="font-medium text-gray-900">{commentTarget.title}</p>
              {commentTarget.internalId && (
                <p className="text-sm text-gray-500">{commentTarget.internalId}</p>
              )}
            </div>
            <Textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment…"
              rows={4}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submitComment()
              }}
            />
            {commentError && <p className="text-sm text-red-600">{commentError}</p>}
            <div className="flex items-center gap-3">
              <Button onClick={submitComment} disabled={submitting || !comment.trim()}>
                {submitting ? "Saving…" : "Add Comment"}
              </Button>
              <Button variant="ghost" type="button" onClick={() => setCommentTarget(null)}>
                Cancel
              </Button>
              <span className="text-xs text-gray-400 ml-auto">Ctrl+Enter</span>
            </div>
          </div>
        )}
      </Dialog>
    </>
  )
}
