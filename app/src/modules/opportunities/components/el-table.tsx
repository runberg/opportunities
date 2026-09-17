"use client"

import { OppTableView } from "@/modules/opportunities/components/table"
import type { OppTableRow } from "@/modules/opportunities/components/opportunity-data-table"

export interface ELRow extends OppTableRow {
  _count: { comments: number; documents: number }
}

export function ELTable({
  opportunities, currentUserId, isAdmin, isReadOnly = false, initialOpenId,
}: {
  readonly opportunities: ELRow[]
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly isReadOnly?: boolean
  readonly initialOpenId?: string
}) {
  return (
    <OppTableView
      opportunities={opportunities}
      currentUserId={currentUserId}
      isAdmin={isAdmin}
      isReadOnly={isReadOnly}
      initialSortKey="internalId"
      dateColumn={{ label: "EL Requested", sortKey: "elRequestedDate", getValue: (r) => r.elRequestedDate }}
      emptyMessage="No engagement letters found."
      initialOpenId={initialOpenId}
    />
  )
}
