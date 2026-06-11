"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { sortRows, type SortDir } from "@/components/ui/sortable-header"
import { OpportunityDataTable, type OppTableRow } from "@/components/opportunities/opportunity-data-table"
import { OpportunityModal } from "@/components/opportunities/opportunity-modal"

export interface RecentRow extends OppTableRow {
  updatedAt: string
}

export function RecentActivity({ items, currentUserId, isAdmin }: {
  readonly items: RecentRow[]
  readonly currentUserId: string
  readonly isAdmin: boolean
}) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState("updatedAt")
  const [sortDir, setSortDir] = useState<SortDir>("desc")

  const sorted = useMemo(() => sortRows(items, sortKey, sortDir), [items, sortKey, sortDir])

  if (items.length === 0) return null

  return (
    <>
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">Recent Activity</h2>
        <OpportunityDataTable
          rows={sorted}
          emptyMessage="No recent activity."
          sortKey={sortKey}
          sortDir={sortDir}
          onSort={(k, d) => { setSortKey(k); setSortDir(d) }}
          dateColumn={{ label: "Updated", sortKey: "updatedAt", getValue: (r) => r.updatedAt }}
          onRowClick={setOpenId}
        />
      </div>

      <OpportunityModal
        opportunityId={openId}
        onClose={() => { setOpenId(null); router.refresh() }}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </>
  )
}
