"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { MessageSquarePlus } from "lucide-react"
import { sortRows, type SortDir } from "@/shared/components/ui/sortable-header"
import { OpportunityDataTable, type OppTableRow, type DateColumn } from "@/modules/opportunities/components/opportunity-data-table"
import { OpportunityModal } from "@/modules/opportunities/components/opportunity-modal"
import { CommentDialog } from "@/modules/opportunities/components/comment-dialog"

export interface OpportunityRow extends OppTableRow {
  quoteSentDate?: string | null
  _count: { comments: number; documents: number }
}

export function OppTableView({
  opportunities, currentUserId, isAdmin, isReadOnly, initialSortKey, dateColumn, emptyMessage,
}: {
  readonly opportunities: OppTableRow[]
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly isReadOnly: boolean
  readonly initialSortKey: string
  readonly dateColumn: DateColumn
  readonly emptyMessage: string
}) {
  const router = useRouter()
  const [openModalId, setOpenModalId] = useState<string | null>(null)
  const [commentTarget, setCommentTarget] = useState<OppTableRow | null>(null)
  const [sortKey, setSortKey] = useState(initialSortKey)
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(
    () => sortRows(opportunities, sortKey, sortDir, sortKey === "internalId" ? "createdAt" : undefined),
    [opportunities, sortKey, sortDir]
  )

  return (
    <>
      <OpportunityDataTable
        rows={sorted}
        emptyMessage={emptyMessage}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(k, d) => { setSortKey(k); setSortDir(d) }}
        dateColumn={dateColumn}
        onRowClick={setOpenModalId}
        renderAction={isReadOnly ? undefined : (row) => (
          <button
            type="button"
            onClick={() => setCommentTarget(row)}
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
        isReadOnly={isReadOnly}
      />

      <CommentDialog
        target={commentTarget}
        commentEndpoint={commentTarget ? `/api/opportunities/${commentTarget.id}/comments` : ""}
        onClose={() => setCommentTarget(null)}
      />
    </>
  )
}

export function OpportunitiesTable({
  opportunities, currentUserId, isAdmin, isReadOnly = false,
}: {
  readonly opportunities: OpportunityRow[]
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly isReadOnly?: boolean
}) {
  return (
    <OppTableView
      opportunities={opportunities}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      isReadOnly={isReadOnly}
      initialSortKey="internalId"
      dateColumn={{ label: "RFQ Date", sortKey: "rfqDate", getValue: (r) => r.rfqDate }}
      emptyMessage="No opportunities found."
    />
  )
}
