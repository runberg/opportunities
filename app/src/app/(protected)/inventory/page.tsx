import { findAllPackages } from "@/app/api/inventory/_helpers"
import { InventoryClient } from "@/modules/inventory/components/inventory-client"
import { requireSectionAccess } from "@/shared/lib/page-access"

export default async function InventoryPage() {
  const { session, isAdmin, isReadOnly } = await requireSectionAccess("inventory")
  const isOpportunitiesReadOnly = !isAdmin && session.user.opportunitiesAccess === "READ_ONLY"

  const packages = await findAllPackages()

  const serialized = packages.map((pkg) => ({
    ...pkg,
    createdAt: pkg.createdAt.toISOString(),
    updatedAt: pkg.updatedAt.toISOString(),
    items: pkg.items.map((item) => ({
      ...item,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString(),
      utilizations: item.utilizations.map((u) => ({
        ...u,
        date: u.date.toISOString(),
        createdAt: u.createdAt.toISOString(),
      })),
    })),
  }))

  return (
    <InventoryClient
      initialPackages={serialized}
      currentUserId={session.user.id}
      isAdmin={isAdmin}
      isReadOnly={isReadOnly}
      isOpportunitiesReadOnly={isOpportunitiesReadOnly}
    />
  )
}
