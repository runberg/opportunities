import { db } from "@/shared/lib/db"
import { writeLog } from "@/shared/lib/system-log"

/**
 * After a line item is added, updated, or deleted, check whether the deliverable
 * should be downgraded from APPROVED to PARTIALLY_APPROVED because line items
 * now exceed the approved amount. No-op if status is anything other than APPROVED.
 */
export async function recomputeApprovalStatus(
  deliverableId: string,
  userId: string
): Promise<void> {
  const del = await db.adhocDeliverable.findUnique({
    where: { id: deliverableId },
    include: { lineItems: true },
  })
  if (del?.status !== "APPROVED") return

  const lineTotal = del.lineItems.reduce((s, li) => s + Number(li.amount), 0)
  if (lineTotal <= Number(del.approvedAmount)) return

  await db.adhocDeliverable.update({
    where: { id: deliverableId },
    data: { status: "PARTIALLY_APPROVED" },
  })

  await writeLog({
    type: "ADHOC_DELIVERABLE_UPDATED",
    message: `"${del.title}" downgraded to Partially Approved — line items (${lineTotal.toFixed(2)}) now exceed approved amount (${Number(del.approvedAmount).toFixed(2)})`,
    userId,
    adhocDeliverableId: deliverableId,
  })
}
