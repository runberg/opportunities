import { PageHeader } from "@/shared/components/layout/page-header"
import { redirect } from "next/navigation"
import { ProductsClient } from "@/modules/admin/components/products-client"
import { unitTypeOption } from "@/modules/opportunities/deliveries/unit-types"
import { db } from "@/shared/lib/db"
import { requirePortalPageSession } from "@/shared/lib/page-access"

export default async function AdminProductsPage() {
  const session = await requirePortalPageSession()
  if (session.user.role !== "ADMIN") redirect("/dashboard")

  const products = await db.deliveryUnitType.findMany({ orderBy: { name: "asc" }, select: unitTypeOption })

  return (
    <div>
      <PageHeader title="Products" description="Products available when planning deliveries." />
      <ProductsClient products={products} />
    </div>
  )
}
