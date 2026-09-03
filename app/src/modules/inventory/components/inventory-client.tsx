"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import { Plus } from "lucide-react"
import { Button } from "@/shared/components/ui/button"
import { OpportunityModal } from "@/modules/opportunities/components/opportunity-modal"
import { PackageCard } from "./package-card"
import { PackageForm } from "./package-form"
import { UtilizeItemModal } from "./utilize-item-modal"

// ─── Types ────────────────────────────────────────────────────────────────────

export type UtilizationRow = {
  id: string
  quantity: number
  date: string
  comment: string | null
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
  id: string
  productName: string
  originalQuantity: number
  remainingQuantity: number
  createdAt: string
  utilizations: UtilizationRow[]
}

export type PackageRow = {
  id: string
  name: string
  comment: string | null
  createdAt: string
  updatedAt: string
  createdBy: { id: string; name: string }
  opportunity: { id: string; title: string; customer: string; internalId: string | null } | null
  items: ItemRow[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function InventoryClient({
  initialPackages,
  currentUserId,
  isAdmin,
  isReadOnly,
  isOpportunitiesReadOnly,
}: {
  readonly initialPackages: PackageRow[]
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly isReadOnly: boolean
  readonly isOpportunitiesReadOnly: boolean
}) {
  const [packages, setPackages] = useState(initialPackages)
  const [formTarget, setFormTarget] = useState<PackageRow | "new" | null>(null)
  const [utilizeItem, setUtilizeItem] = useState<ItemRow | null>(null)
  const [utilizeEntry, setUtilizeEntry] = useState<UtilizationRow | null>(null)
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track stock packages and item utilizations</p>
        </div>
        {!isReadOnly && (
          <Button onClick={() => setFormTarget("new")}>
            <Plus size={16} className="mr-1.5" />
            New Package
          </Button>
        )}
      </div>

      {packages.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <p className="text-sm text-gray-400">No inventory packages yet. Create one to get started.</p>
        </div>
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

      {mounted && createPortal(
        <OpportunityModal
          opportunityId={openOpportunityId}
          onClose={() => setOpenOpportunityId(null)}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isReadOnly={isOpportunitiesReadOnly}
        />,
        document.body
      )}
    </div>
  )
}
