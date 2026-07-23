import { findAllAgreements } from "@/app/api/adhoc/_helpers"
import { AdhocClient } from "@/modules/adhoc/components/adhoc-client"
import { requireSectionAccess } from "@/shared/lib/page-access"

export default async function AdHocPage() {
  const { session, isAdmin, isReadOnly } = await requireSectionAccess("adhoc")

  const agreements = await findAllAgreements()

  const serialized = agreements.map((a) => ({
    ...a,
    totalAmount: a.totalAmount.toString(),
    signedDate: a.signedDate ? a.signedDate.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    deliverables: a.deliverables.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
      approvedAmount: d.approvedAmount.toString(),
      approvedAt: d.approvedAt ? d.approvedAt.toISOString() : null,
      deliveredAt: d.deliveredAt ? d.deliveredAt.toISOString() : null,
      lineItems: d.lineItems.map((li) => ({ amount: li.amount.toString() })),
    })),
    documents: a.documents.map((doc) => ({
      ...doc,
      uploadedAt: doc.uploadedAt.toISOString(),
    })),
  }))

  return (
    <AdhocClient
      initialAgreements={serialized}
      currentUserId={session.user.id}
      isAdmin={isAdmin}
      isReadOnly={isReadOnly}
    />
  )
}
