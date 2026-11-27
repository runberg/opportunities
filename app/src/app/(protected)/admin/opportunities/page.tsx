import { PageHeader } from "@/shared/components/layout/page-header"
import { requirePortalPageSession } from "@/shared/lib/page-access"
import { redirect } from "next/navigation"
import { DeletePageTabs } from "@/modules/admin/components/delete-page-tabs"

export default async function AdminOpportunitiesPage() {
  const session = await requirePortalPageSession()
  if (session?.user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div>
      <PageHeader title="Delete Records" description="Permanently delete opportunities, ad hoc agreements, or work packages." />
      <DeletePageTabs />
    </div>
  )
}
