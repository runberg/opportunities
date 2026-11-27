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
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
        <p className="mt-1 text-sm text-gray-600">Products available when planning deliveries.</p>
      </div>
      <ProductsClient products={products} />
    </div>
  )
}
