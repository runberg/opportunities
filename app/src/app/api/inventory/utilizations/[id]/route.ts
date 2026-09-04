import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { saveUploadedFile, deleteUploadedFile, MAX_UPLOAD_BYTES } from "@/shared/lib/upload"
import { DELIVERY_NOTE_MIMES } from "@/shared/lib/file-types"
import { InventoryAllocationStatus } from "@prisma/client"

const ALLOCATION_STATUSES = Object.values(InventoryAllocationStatus)

type ParsedEdit = {
  quantity: number
  dateRaw: string | null
  commentRaw: string | null
  displayNameRaw: string | null
  opportunityIdRaw: string | null
  allocationStatusRaw: string | null
  file: File | null
}

/** Parses and validates the edit-utilization form against the existing quantity as a fallback. */
async function parseEditForm(formData: FormData, existingQuantity: number): Promise<{ error: string } | ParsedEdit> {
  const quantityRaw = formData.get("quantity") as string | null
  const dateRaw = formData.get("date") as string | null
  const commentRaw = formData.get("comment") as string | null
  const displayNameRaw = formData.get("displayName") as string | null
  const opportunityIdRaw = formData.get("opportunityId") as string | null
  const allocationStatusRaw = formData.get("allocationStatus") as string | null
  const file = formData.get("file") as File | null

  const quantity = quantityRaw !== null ? Number(quantityRaw) : existingQuantity
  if (!Number.isInteger(quantity) || quantity <= 0)
    return { error: "Quantity must be a positive whole number" }
  if (dateRaw !== null && Number.isNaN(Date.parse(dateRaw)))
    return { error: "Invalid date" }
  if (allocationStatusRaw !== null && !ALLOCATION_STATUSES.includes(allocationStatusRaw as InventoryAllocationStatus))
    return { error: "Invalid allocation status" }

  if (file && file.size > 0) {
    if (!DELIVERY_NOTE_MIMES.has(file.type))
      return { error: "Only Word (.docx), PDF, and Excel files are allowed" }
    if (file.size > MAX_UPLOAD_BYTES)
      return { error: "File exceeds 50 MB limit" }
  }

  const opportunityId = opportunityIdRaw?.trim() || null
  if (opportunityId && !(await db.opportunity.findUnique({ where: { id: opportunityId } })))
    return { error: "Opportunity not found" }

  return { quantity, dateRaw, commentRaw, displayNameRaw, opportunityIdRaw, allocationStatusRaw, file }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session
  if (!hasSectionAccess(session, "inventory", "FULL"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const existing = await db.inventoryUtilization.findUnique({ where: { id }, include: { item: true } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const parsed = await parseEditForm(await req.formData(), existing.quantity)
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { quantity, dateRaw, commentRaw, displayNameRaw, opportunityIdRaw, allocationStatusRaw, file } = parsed

  const saved = file && file.size > 0 ? await saveUploadedFile(file) : null

  let utilization
  try {
    utilization = await db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUniqueOrThrow({ where: { id: existing.itemId } })
      const delta = quantity - existing.quantity
      const newRemaining = item.remainingQuantity - delta
      if (newRemaining < 0) throw new Error(`Quantity exceeds the ${item.remainingQuantity + existing.quantity} available`)
      if (newRemaining > item.originalQuantity) throw new Error("Quantity can't be reduced below zero utilized")
      if (delta !== 0) {
        await tx.inventoryItem.update({ where: { id: item.id }, data: { remainingQuantity: newRemaining } })
      }
      return tx.inventoryUtilization.update({
        where: { id },
        data: {
          quantity,
          ...(dateRaw !== null && { date: new Date(dateRaw) }),
          ...(commentRaw !== null && { comment: commentRaw.trim() || null }),
          ...(displayNameRaw !== null && { displayName: displayNameRaw.trim() || null }),
          ...(opportunityIdRaw !== null && { opportunityId: opportunityIdRaw.trim() || null }),
          ...(allocationStatusRaw !== null && { allocationStatus: allocationStatusRaw as InventoryAllocationStatus }),
          ...(saved && { filename: saved.filename, originalName: saved.originalName, mimeType: file!.type, size: file!.size }),
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          opportunity: { select: { id: true, title: true, customer: true, internalId: true, status: true } },
        },
      })
    })
  } catch (err) {
    if (saved) await deleteUploadedFile(saved.filename)
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to update utilization" }, { status: 400 })
  }

  if (saved && existing.filename) await deleteUploadedFile(existing.filename)

  await writeLog({
    type: "INVENTORY_UTILIZATION_UPDATED",
    message: `Utilization of "${existing.item.productName}" updated`,
    userId: session.user.id,
    inventoryPackageId: existing.item.packageId,
  })

  return NextResponse.json(utilization)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const { id } = await params
  const existing = await db.inventoryUtilization.findUnique({ where: { id }, include: { item: true } })
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.$transaction([
    db.inventoryItem.update({
      where: { id: existing.itemId },
      data: { remainingQuantity: existing.item.remainingQuantity + existing.quantity },
    }),
    db.inventoryUtilization.delete({ where: { id } }),
  ])

  if (existing.filename) await deleteUploadedFile(existing.filename)

  await writeLog({
    type: "INVENTORY_UTILIZATION_DELETED",
    message: `Utilization of "${existing.item.productName}" (qty ${existing.quantity}) deleted`,
    userId: session.user.id,
    inventoryPackageId: existing.item.packageId,
  })

  return NextResponse.json({ ok: true })
}
