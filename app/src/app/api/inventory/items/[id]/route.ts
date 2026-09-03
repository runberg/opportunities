import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"

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
  const item = await db.inventoryItem.findUnique({ where: { id } })
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { productName, originalQuantity } = body

  if (productName !== undefined && (typeof productName !== "string" || productName.trim() === ""))
    return NextResponse.json({ error: "Product name is required" }, { status: 400 })

  const utilized = item.originalQuantity - item.remainingQuantity
  let newOriginal = item.originalQuantity
  let newRemaining = item.remainingQuantity
  if (originalQuantity !== undefined) {
    const qty = Number(originalQuantity)
    if (!Number.isInteger(qty) || qty <= 0)
      return NextResponse.json({ error: "Original quantity must be a positive whole number" }, { status: 400 })
    if (qty < utilized)
      return NextResponse.json({ error: `Original quantity can't be less than the ${utilized} already utilized` }, { status: 400 })
    newOriginal = qty
    newRemaining = qty - utilized
  }

  const updated = await db.inventoryItem.update({
    where: { id },
    data: {
      ...(productName !== undefined && { productName: productName.trim() }),
      originalQuantity: newOriginal,
      remainingQuantity: newRemaining,
    },
    include: { utilizations: { include: { createdBy: { select: { id: true, name: true } } } } },
  })

  await writeLog({
    type: "INVENTORY_ITEM_UPDATED",
    message: `Item "${updated.productName}" updated`,
    userId: session.user.id,
    inventoryPackageId: item.packageId,
  })

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
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

  if (item.remainingQuantity !== item.originalQuantity)
    return NextResponse.json({ error: "Can't delete an item that already has utilizations" }, { status: 400 })

  await db.inventoryItem.delete({ where: { id } })

  await writeLog({
    type: "INVENTORY_ITEM_DELETED",
    message: `Item "${item.productName}" deleted`,
    userId: session.user.id,
    inventoryPackageId: item.packageId,
  })

  return NextResponse.json({ ok: true })
}
