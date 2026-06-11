"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { MessageSquarePlus } from "lucide-react"
import { sortRows, type SortDir } from "@/shared/components/ui/sortable-header"
import { OpportunityDataTable, type OppTableRow } from "@/modules/opportunities/components/opportunity-data-table"
import { OpportunityModal } from "@/modules/opportunities/components/opportunity-modal"
import { CommentDialog } from "@/modules/opportunities/components/comment-dialog"

export interface OpportunityRow extends OppTableRow {
  quoteSentDate?: string | null
  _count: { comments: number; documents: number }
}

export function OpportunitiesTable({
  opportunities, currentUserId, isAdmin,
}: {
  readonly opportunities: OpportunityRow[]
  readonly currentUserId: string
  readonly isAdmin: boolean
}) {
  const router = useRouter()
  const [openModalId, setOpenModalId] = useState<string | null>(null)
  const [commentTarget, setCommentTarget] = useState<OpportunityRow | null>(null)
  const [sortKey, setSortKey] = useState("rfqDate")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => sortRows(opportunities, sortKey, sortDir), [opportunities, sortKey, sortDir])

  return (
    <>
      <OpportunityDataTable
        rows={sorted}
        emptyMessage="No opportunities found."
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(k, d) => { setSortKey(k); setSortDir(d) }}
        dateColumn={{ label: "RFQ Date", sortKey: "rfqDate", getValue: (r) => r.rfqDate }}
        onRowClick={setOpenModalId}
        renderAction={(row) => (
          <button
            type="button"
            onClick={() => setCommentTarget(row as OpportunityRow)}
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
