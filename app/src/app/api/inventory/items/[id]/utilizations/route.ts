import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { saveUploadedFile, MAX_UPLOAD_BYTES } from "@/shared/lib/upload"
import { DELIVERY_NOTE_MIMES } from "@/shared/lib/file-types"
import { InventoryAllocationStatus } from "@prisma/client"

const ALLOCATION_STATUSES = Object.values(InventoryAllocationStatus)

type ParsedForm = {
  quantity: number
  dateRaw: string
  comment: string | null
  displayName: string | null
  opportunityId: string | null
  allocationStatus: InventoryAllocationStatus
  file: File | null
}

/** Parses and validates the utilize-item form. Returns an error message, or the parsed fields. */
async function parseUtilizationForm(formData: FormData): Promise<{ error: string } | ParsedForm> {
  const quantity = Number(formData.get("quantity"))
  const dateRaw = formData.get("date") as string | null
  const comment = (formData.get("comment") as string | null)?.trim() || null
  const displayName = (formData.get("displayName") as string | null)?.trim() || null
  const opportunityId = (formData.get("opportunityId") as string | null)?.trim() || null
  const allocationStatusRaw = formData.get("allocationStatus") as string | null
  const file = formData.get("file") as File | null

  if (!Number.isInteger(quantity) || quantity <= 0)
    return { error: "Quantity must be a positive whole number" }
  if (!dateRaw || Number.isNaN(Date.parse(dateRaw)))
    return { error: "A valid date is required" }
  if (!allocationStatusRaw || !ALLOCATION_STATUSES.includes(allocationStatusRaw as InventoryAllocationStatus))
    return { error: "Invalid allocation status" }

  if (file && file.size > 0) {
    if (!DELIVERY_NOTE_MIMES.has(file.type))
      return { error: "Only Word (.docx), PDF, and Excel files are allowed" }
    if (file.size > MAX_UPLOAD_BYTES)
      return { error: "File exceeds 50 MB limit" }
  }

  if (opportunityId && !(await db.opportunity.findUnique({ where: { id: opportunityId } })))
    return { error: "Opportunity not found" }

  return { quantity, dateRaw, comment, displayName, opportunityId, allocationStatus: allocationStatusRaw as InventoryAllocationStatus, file }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session
  if (!hasSectionAccess(session, "inventory", "FULL"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const item = await db.inventoryItem.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const parsed = await parseUtilizationForm(await req.formData())
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { quantity, dateRaw, comment, displayName, opportunityId, allocationStatus, file } = parsed

  const saved = file && file.size > 0 ? await saveUploadedFile(file) : null

  let utilization
  try {
    utilization = await db.$transaction(async (tx) => {
      const current = await tx.inventoryItem.findUniqueOrThrow({ where: { id } })
      if (quantity > current.remainingQuantity) {
        throw new Error(`Quantity exceeds the ${current.remainingQuantity} remaining`)
      }
      await tx.inventoryItem.update({
        where: { id },
        data: { remainingQuantity: current.remainingQuantity - quantity },
      })
      return tx.inventoryUtilization.create({
        data: {
          quantity,
          date: new Date(dateRaw),
          comment,
          displayName,
          opportunityId,
          allocationStatus,
          filename: saved?.filename ?? null,
          originalName: saved?.originalName ?? null,
          mimeType: saved && file ? file.type : null,
          size: saved && file ? file.size : null,
          itemId: id,
          createdById: session.user.id,
        },
        include: {
          createdBy: { select: { id: true, name: true } },
          opportunity: { select: { id: true, title: true, customer: true, internalId: true, status: true } },
        },
      })
    })
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Failed to record utilization" }, { status: 400 })
  }

  await writeLog({
    type: "INVENTORY_ITEM_UTILIZED",
    message: `${quantity} of "${item.productName}" utilized`,
    userId: session.user.id,
    inventoryPackageId: item.packageId,
  })

  return NextResponse.json(utilization, { status: 201 })
}
