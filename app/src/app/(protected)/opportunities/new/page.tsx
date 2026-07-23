import { requireFullSectionAccess } from "@/shared/lib/page-access"
import { OpportunityForm } from "@/modules/opportunities/components/opportunity-form"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function NewOpportunityPage() {
  await requireFullSectionAccess("opportunities", "/opportunities")

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/opportunities"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeft size={16} />
          Opportunities
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">New Opportunity</h1>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <OpportunityForm mode="create" />
        </div>
      </div>
    </div>
  )
}
