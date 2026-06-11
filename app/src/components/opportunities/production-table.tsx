"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { sortRows, type SortDir } from "@/components/ui/sortable-header"
import { OpportunityDataTable, type OppTableRow } from "@/components/opportunities/opportunity-data-table"
import { OpportunityModal } from "@/components/opportunities/opportunity-modal"

export interface ProductionRow extends OppTableRow {
  deliveredDate?: string | null
  _count: { comments: number; documents: number }
}

export function ProductionTable({
  opportunities, currentUserId, isAdmin,
}: {
  readonly opportunities: ProductionRow[]
  readonly currentUserId: string
  readonly isAdmin: boolean
}) {
  const router = useRouter()
  const [openModalId, setOpenModalId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState("title")
  const [sortDir, setSortDir] = useState<SortDir>("asc")

  const sorted = useMemo(() => sortRows(opportunities, sortKey, sortDir), [opportunities, sortKey, sortDir])

  return (
    <>
      <OpportunityDataTable
        rows={sorted}
        emptyMessage="No production items found."
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(k, d) => { setSortKey(k); setSortDir(d) }}
        showPhases
        onRowClick={setOpenModalId}
      />

      <OpportunityModal
        opportunityId={openModalId}
        onClose={() => { setOpenModalId(null); router.refresh() }}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </>
  )
}
