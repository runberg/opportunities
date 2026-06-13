import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import { redirect } from "next/navigation"
import { DeletePageTabs } from "@/modules/admin/components/delete-page-tabs"

export default async function AdminOpportunitiesPage() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Delete Records</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
          Permanently delete opportunities, ad hoc agreements, or work packages.
        </p>
      </div>
      <DeletePageTabs />
    </div>
  )
}
