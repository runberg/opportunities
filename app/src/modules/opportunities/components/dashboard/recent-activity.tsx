"use client"

import { Panel } from "@/shared/components/ui/panel"
import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { sortRows, type SortDir } from "@/shared/components/ui/sortable-header"
import { OpportunityDataTable, type OppTableRow } from "@/modules/opportunities/components/opportunity-data-table"
import { OpportunityModal } from "@/modules/opportunities/components/opportunity-modal"

export interface RecentRow extends OppTableRow {
  updatedAt: string
}

export function RecentActivity({ items, isAdmin, isReadOnly = false }: {
  readonly items: RecentRow[]
  readonly isAdmin: boolean
  readonly isReadOnly?: boolean
}) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState("updatedAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => sortRows(items, sortKey, sortDir), [items, sortKey, sortDir])

  if (items.length === 0) return null

  return (
    <>
      <Panel className="p-5">
        <h2 className="mb-4 text-base font-semibold text-gray-900">Recent Activity</h2>
        <OpportunityDataTable
          rows={sorted}
          emptyMessage="No recent activity."
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={(k, d) => { setSortKey(k); setSortDir(d) }}
          dateColumn={{ label: "Updated", sortKey: "updatedAt", getValue: (r) => r.updatedAt }}
          onRowClick={setOpenId}
          allowComments={!isReadOnly}
        />
      </Panel>

      <OpportunityModal
        opportunityId={openId}
        onClose={() => { setOpenId(null); router.refresh() }}
        isAdmin={isAdmin}
        isReadOnly={isReadOnly}
      />
    </>
  )
}
