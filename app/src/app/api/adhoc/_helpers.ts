import { db } from "@/shared/lib/db"
import { writeLog } from "@/shared/lib/system-log"

export function findAllAgreements() {
  return db.adhocAgreement.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      deliverables: {
        select: {
          id: true,
          internalId: true,
          createdAt: true,
          title: true,
          status: true,
          approvedAmount: true,
          approverName: true,
          approvedAt: true,
          deliveredAt: true,
          deliveryNoteRef: true,
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
}

/**
 * After a line item is added, updated, or deleted, check whether the deliverable
 * should be downgraded because line items now exceed the approved amount.
 *
 * Applies when status is APPROVED or DELIVERED:
 *   - lineTotal > approvedAmount and approvedAmount > 0  → PARTIALLY_APPROVED
 *   - lineTotal > approvedAmount and approvedAmount == 0 → NOT_APPROVED
 * Also clears deliveredAt when downgrading from DELIVERED.
 */
export async function recomputeApprovalStatus(
  deliverableId: string,
  userId: string
): Promise<void> {
  const del = await db.adhocDeliverable.findUnique({
    where: { id: deliverableId },
    include: { lineItems: true },
  })
  if (del?.status !== "APPROVED" && del?.status !== "DELIVERED") return

  const lineTotal = del.lineItems.reduce((s, li) => s + Number(li.amount), 0)
  const approvedAmount = Number(del.approvedAmount)
  if (lineTotal <= approvedAmount) return

  const newStatus = approvedAmount > 0 ? "PARTIALLY_APPROVED" : "NOT_APPROVED"
  const wasDelivered = del.status === "DELIVERED"

  await db.adhocDeliverable.update({
    where: { id: deliverableId },
    data: {
      status: newStatus,
      ...(wasDelivered && { deliveredAt: null }),
    },
  })

  const label = newStatus === "NOT_APPROVED" ? "Not Approved" : "Partially Approved"
  const reason = approvedAmount > 0
    ? `line items (${lineTotal.toFixed(2)}) exceed approved amount (${approvedAmount.toFixed(2)})`
    : `line items (${lineTotal.toFixed(2)}) added with no approved amount`
  await writeLog({
    type: "ADHOC_DELIVERABLE_UPDATED",
    message: `"${del.title}" downgraded to ${label} — ${reason}`,
    userId,
    adhocDeliverableId: deliverableId,
  })
}
