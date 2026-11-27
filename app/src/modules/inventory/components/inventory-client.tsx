"use client"

import { Panel } from "@/shared/components/ui/panel"
import { PageHeader } from "@/shared/components/layout/page-header"
import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { OpportunityModal } from "@/modules/opportunities/components/opportunity-modal"
import type { AdhocLink } from "./adhoc-link"
import { PackageCard } from "./package-card"
import { PackageForm } from "./package-form"
import { UtilizeItemModal } from "./utilize-item-modal"
import { EditItemModal } from "./edit-item-modal"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AllocationStatus = "RESERVED" | "ALLOCATED"

export type UtilizationRow = {
  adhocDeliverable: AdhocLink | null
  id: string
  quantity: number
  date: string
  comment: string | null
  allocationStatus: AllocationStatus
  displayName: string | null
  filename: string | null
  originalName: string | null
  mimeType: string | null
  size: number | null
  createdAt: string
  createdBy: { id: string; name: string }
  opportunity: { id: string; title: string; customer: string; internalId: string | null; status: string } | null
}

export type ItemRow = {
  adhocDeliverable: AdhocLink | null
  id: string
  productName: string
  originalQuantity: number
  remainingQuantity: number
  createdAt: string
  utilizations: UtilizationRow[]
}

export type PackageRow = {
  adhocDeliverable: AdhocLink | null
  id: string
  name: string
  comment: string | null
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string }
  opportunity: { id: string; title: string; customer: string; internalId: string | null } | null
  filename: string | null
  originalName: string | null
  mimeType: string | null
  size: number | null
  items: ItemRow[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InventoryClient({
  initialPackages,
  isAdmin,
  isReadOnly,
  isOpportunitiesReadOnly,
}: {
  readonly initialPackages: PackageRow[]
  readonly isAdmin: boolean
  readonly isReadOnly: boolean
  readonly isOpportunitiesReadOnly: boolean
}) {
  const [packages, setPackages] = useState(initialPackages)
  const [formTarget, setFormTarget] = useState<PackageRow | "new" | null>(null)
  const [utilizeItem, setUtilizeItem] = useState<ItemRow | null>(null)
  const [utilizeEntry, setUtilizeEntry] = useState<UtilizationRow | null>(null)
  const [editItemTarget, setEditItemTarget] = useState<ItemRow | null>(null)
  const [openOpportunityId, setOpenOpportunityId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  async function refresh() {
    const res = await fetch("/api/inventory/packages")
    if (res.ok) setPackages(await res.json())
  }

  function openUtilize(item: ItemRow) {
    setUtilizeItem(item)
    setUtilizeEntry(null)
  }

  function openEditUtilization(item: ItemRow, utilization: UtilizationRow) {
    setUtilizeItem(item)
    setUtilizeEntry(utilization)
  }

  return (
    <div>
      <PageHeader title="Inventory" description="Track stock packages and item utilizations"
        actions={!isReadOnly && <Button onClick={() => setFormTarget("new")}><Plus size={16} className="mr-1.5" />New Package</Button>} />

      {packages.length === 0 ? (
        <Panel className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400">No inventory packages yet. Create one to get started.</p>
        </Panel>
      ) : (
        packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            isReadOnly={isReadOnly}
            isAdmin={isAdmin}
            onRefresh={refresh}
            onEditPackage={setFormTarget}
            onUtilize={openUtilize}
            onEditUtilization={openEditUtilization}
            onEditItem={setEditItemTarget}
            onOpenOpportunity={setOpenOpportunityId}
          />
        ))
      )}

      <PackageForm
        open={!!formTarget}
        pkg={formTarget === "new" ? null : formTarget}
        onClose={() => setFormTarget(null)}
        onSaved={refresh}
      />

      <UtilizeItemModal
        item={utilizeItem}
        utilization={utilizeEntry}
        onClose={() => { setUtilizeItem(null); setUtilizeEntry(null) }}
        onSaved={refresh}
      />

      <EditItemModal
        item={editItemTarget}
        onClose={() => setEditItemTarget(null)}
        onSaved={refresh}
      />

      {mounted && createPortal(
        <OpportunityModal
          opportunityId={openOpportunityId}
          onClose={() => setOpenOpportunityId(null)}
          isAdmin={isAdmin}
          isReadOnly={isOpportunitiesReadOnly}
        />,
        document.body
      )}
    </div>
  )
}
