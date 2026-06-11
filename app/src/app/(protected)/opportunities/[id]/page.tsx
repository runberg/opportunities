import { db } from "@/shared/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import { notFound } from "next/navigation"
import { formatDate, formatDateTime } from "@/shared/lib/utils"
import { StatusBadge, PendingBadge } from "@/modules/opportunities/components/status-badge"
import { LogSection } from "@/modules/opportunities/components/log-section"
import { DocumentSection } from "@/modules/opportunities/components/document-section"
import Link from "next/link"
import { ChevronLeft, Pencil } from "lucide-react"

export default async function OpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getServerSession(authOptions)

  const opportunity = await db.opportunity.findUnique({
    where: { id },
    include: {
      createdBy: { select: { id: true, name: true } },
      comments: {
        include: { author: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
      documents: {
        include: { uploadedBy: { select: { id: true, name: true } } },
        orderBy: { uploadedAt: "desc" },
      },
    },
  })

  if (!opportunity) notFound()

  const isAdmin = session?.user.role === "ADMIN"

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        href="/opportunities"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
      >
        <ChevronLeft size={16} />
        Opportunities
      </Link>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{opportunity.title}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <StatusBadge status={opportunity.status} />
            <PendingBadge waitingOn={opportunity.waitingOn} />
          </div>
        </div>
        <Link
          href={`/opportunities/${opportunity.id}/edit`}
          className="inline-flex items-center gap-1.5 px-3 py-2 border border-gray-300 text-sm text-gray-700 rounded-lg hover:bg-gray-50 transition-colors self-start flex-shrink-0"
        >
          <Pencil size={14} />
          Edit
        </Link>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <InfoItem label="Customer" value={opportunity.customer} />
        {opportunity.internalId && (
          <InfoItem label="Internal ID" value={opportunity.internalId} />
        )}
        {opportunity.reference && (
          <InfoItem label="Quote Reference" value={opportunity.reference} />
        )}
        {opportunity.rfqDate && (
          <InfoItem label="RFQ Date" value={formatDate(opportunity.rfqDate)} />
        )}
        {opportunity.quoteSentDate && (
          <InfoItem label="Quote Sent" value={formatDate(opportunity.quoteSentDate)} />
        )}
        <InfoItem label="Created by" value={opportunity.createdBy.name} />
        {opportunity.product && (
          <InfoItem
            label="Product / Service"
            value={opportunity.product}
            className="col-span-2"
          />
        )}
        <InfoItem label="Created" value={formatDate(opportunity.createdAt)} />
        <InfoItem label="Last updated" value={formatDateTime(opportunity.updatedAt)} />
      </div>

      {/* Notes */}
      {opportunity.description && (
        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Notes</p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{opportunity.description}</p>
        </div>
      )}

      {/* Documents */}
      <DocumentSection
        opportunityId={opportunity.id}
        documents={opportunity.documents as never}
        currentUserId={session!.user.id}
        isAdmin={isAdmin}
      />

      {/* Log */}
      <LogSection
        opportunityId={opportunity.id}
        entries={opportunity.comments as never}
        currentUser={{ id: session!.user.id, name: session!.user.name ?? "User" }}
      />
    </div>
  )
}

function InfoItem({
  label,
  value,
  className = "",
}: {
  label: string
  value: string
  className?: string
}) {
  return (
    <div className={`bg-white border border-gray-200 rounded-xl p-4 ${className}`}>
      <p className="text-xs font-medium text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
    </div>
  )
}
