import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import { db } from "@/shared/lib/db"
import { AdhocClient } from "@/modules/adhoc/components/adhoc-client"

export default async function AdHocPage() {
  const session = await getServerSession(authOptions)

  const agreements = await db.adhocAgreement.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      deliverables: {
        select: {
          id: true,
          title: true,
          status: true,
          approvedAmount: true,
          lineItems: { select: { amount: true } },
          documents: { select: { id: true } },
        },
      },
      documents: {
        orderBy: { uploadedAt: "asc" },
        include: { uploadedBy: { select: { id: true, name: true } } },
      },
    },
  })

  const serialized = agreements.map((a) => ({
    ...a,
    totalAmount: a.totalAmount.toString(),
    signedDate: a.signedDate ? a.signedDate.toISOString() : null,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
    deliverables: a.deliverables.map((d) => ({
      ...d,
      approvedAmount: d.approvedAmount.toString(),
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
