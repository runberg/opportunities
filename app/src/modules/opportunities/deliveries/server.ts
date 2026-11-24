import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/shared/lib/db"
import { hasSectionAccess, requireSession } from "@/shared/lib/api"
import { DELIVERY_NOTE_MIMES } from "@/shared/lib/file-types"
import { deleteUploadedFile, MAX_UPLOAD_BYTES, saveUploadedFile } from "@/shared/lib/upload"
import { writeLog } from "@/shared/lib/system-log"

export const deliveryPlanInput = z.object({
  unitType: z.string().trim().min(1),
  quantity: z.number().int().positive().max(2147483647),
  deliveryMonth: z.number().int().min(1).max(12),
  deliveryYear: z.number().int().min(2020).max(9999),
})

export const shipmentInput = z.object({
  quantity: z.string().regex(/^[0-9]+$/).transform(Number).pipe(deliveryPlanInput.shape.quantity),
  deliveredOn: z.iso.date().transform((value) => new Date(value)),
  comment: z.string().trim().max(500).nullable().transform((value) => value || null),
})

export const shipmentSummary = {
  id: true, quantity: true, deliveredOn: true, comment: true, originalName: true, mimeType: true,
} as const

export class DeliveryError extends Error {
  constructor(message: string, readonly status = 409) {
    super(message)
  }
}

export async function requireDeliveryAccess(minimum: "READ_ONLY" | "FULL") {
  const result = await requireSession()
  if (result.error) return result
  if (!hasSectionAccess(result.session, "opportunities", minimum)) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const
  }
  return result
}

export function deliveryErrorResponse(error: unknown) {
  if (error instanceof DeliveryError) return NextResponse.json({ error: error.message }, { status: error.status })
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
    return NextResponse.json({ error: "Delivery or opportunity not found." }, { status: 404 })
  }
  throw error
}

export async function changeDelivery<T>(action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(action, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034") throw error
    }
  }
  throw new DeliveryError("The delivery changed. Refresh and try again.")
}

export async function getWritableDelivery(tx: Prisma.TransactionClient, opportunityId: string, deliveryId: string) {
  const delivery = await tx.expectedDelivery.findUnique({
    where: { id: deliveryId, opportunityId },
    include: { opportunity: { select: { isArchived: true } } },
  })
  if (!delivery) throw new DeliveryError("Delivery not found.", 404)
  if (delivery.opportunity.isArchived) throw new DeliveryError("Unarchive the opportunity before editing deliveries.")
  return delivery
}

export async function getDeliveredQuantity(tx: Prisma.TransactionClient, deliveryId: string) {
  const totals = await tx.deliveryShipment.aggregate({ where: { deliveryId }, _sum: { quantity: true } })
  return totals._sum.quantity ?? 0
}

export function parseDeliveryNote(entry: FormDataEntryValue | null) {
  if (entry === null) return null
  if (typeof entry === "string" || !entry.size || !DELIVERY_NOTE_MIMES.has(entry.type) ||
      !/\.(pdf|docx|xls|xlsx)$/i.test(entry.name) || /[\r\n]/.test(entry.name)) {
    throw new DeliveryError("Choose a PDF, Word (.docx), or Excel delivery note.", 400)
  }
  if (entry.size > MAX_UPLOAD_BYTES) throw new DeliveryError("The delivery note exceeds 50 MB.", 400)
  return entry
}

async function removeDeliveryNote(filename: string, opportunityId?: string) {
  try {
    await deleteUploadedFile(filename)
  } catch {
    await writeLog({ type: "OPPORTUNITY_UPDATED", message: "Delivery note file cleanup failed.", opportunityId })
  }
}

export async function saveDeliveryNote<T>(
  file: File | null, opportunityId: string,
  action: (attachment: { filename?: string; originalName?: string; mimeType?: string }) => Promise<T>,
) {
  const saved = file ? await saveUploadedFile(file) : null
  try {
    return await action(saved && file ? { ...saved, mimeType: file.type } : {})
  } catch (error) {
    if (saved) await removeDeliveryNote(saved.filename, opportunityId)
    throw error
  }
}

export async function deleteOpportunitiesWithDeliveryNotes(ids: string[]) {
  const { count, attachments } = await changeDelivery(async (tx) => {
    const attachments = await tx.deliveryShipment.findMany({
      where: { filename: { not: null }, delivery: { opportunityId: { in: ids } } },
      select: { filename: true },
    })
    const { count } = await tx.opportunity.deleteMany({ where: { id: { in: ids } } })
    return { count, attachments }
  })
  for (const { filename } of attachments) {
    if (filename) await removeDeliveryNote(filename)
  }
  return count
}
