"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { MessageSquarePlus } from "lucide-react"
import { sortRows, type SortDir } from "@/components/ui/sortable-header"
import { OpportunityDataTable, type OppTableRow } from "@/components/opportunities/opportunity-data-table"
import { OpportunityModal } from "@/components/opportunities/opportunity-modal"
import { CommentDialog } from "@/components/opportunities/comment-dialog"

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
  const [sortKey, setSortKey] = useState("elRequestedDate")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => sortRows(opportunities, sortKey, sortDir), [opportunities, sortKey, sortDir])

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
            onClick={() => setCommentTarget(row as ELRow)}
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

      <CommentDialog target={commentTarget} onClose={() => setCommentTarget(null)} />
    </>
  )
}
