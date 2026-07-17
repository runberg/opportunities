import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import { findAllAgreements } from "@/app/api/adhoc/_helpers"
import { AdhocClient } from "@/modules/adhoc/components/adhoc-client"

export default async function AdHocPage() {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

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
      currentUserId={session!.user.id}
      isAdmin={session!.user.role === "ADMIN"}
    />
  )
}
