import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { notFound } from "next/navigation"
import { toDateString } from "@/lib/utils"
import { OpportunityForm } from "@/components/opportunities/opportunity-form"
import { QuoteSection } from "@/components/opportunities/quote-section"
import Link from "next/link"
import { ChevronLeft } from "lucide-react"

export default async function EditOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  const opportunity = await db.opportunity.findUnique({
    where: { id },
    include: {
      documents: {
        where: { type: "QUOTE" as never },
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { uploadedAt: "desc" },
      },
    },
  })

  if (!opportunity) notFound()

  const isAdmin = session?.user.role === "ADMIN"

  return (
    <div>
      <div className="mb-6">
        <Link
          href={`/opportunities/${id}`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ChevronLeft size={16} />
          {opportunity.title}
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Edit Opportunity</h1>
      </div>

      <div className="max-w-2xl">
        <div className="bg-white border border-gray-200 rounded-xl p-6">
          <OpportunityForm
            mode="edit"
            initialData={{
              id: opportunity.id,
              internalId: opportunity.internalId ?? "",
              title: opportunity.title,
              customer: opportunity.customer,
              reference: opportunity.reference ?? "",
              rfqDate: toDateString(opportunity.rfqDate),
              product: opportunity.product ?? "",
              status: opportunity.status,
              waitingOn: opportunity.waitingOn,
              description: opportunity.description ?? "",
            }}
          />
        </div>

        <QuoteSection
          opportunityId={opportunity.id}
          documents={opportunity.documents.map((d) => ({
            ...d,
            uploadedAt: d.uploadedAt.toISOString(),
          }))}
          currentUserId={session!.user.id}
          isAdmin={isAdmin}
          docType="QUOTE"
        />
      </div>
    </div>
  )
}
