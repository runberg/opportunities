import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import { redirect } from "next/navigation"
import { DeleteOpportunitiesClient } from "@/modules/opportunities/components/delete-opportunities"

export default async function AdminOpportunitiesPage() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Delete Opportunities</h1>
        <p className="text-sm text-gray-500 mt-0.5">Search, filter, select, and permanently delete opportunities.</p>
      </div>
      <DeleteOpportunitiesClient />
    </div>
  )
}
