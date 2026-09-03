import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"

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
  const pkg = await db.inventoryPackage.findUnique({ where: { id } })
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { productName, originalQuantity } = body

  if (!productName || typeof productName !== "string" || productName.trim() === "")
    return NextResponse.json({ error: "Product name is required" }, { status: 400 })
  const qty = Number(originalQuantity)
  if (!Number.isInteger(qty) || qty <= 0)
    return NextResponse.json({ error: "Original quantity must be a positive whole number" }, { status: 400 })

  const item = await db.inventoryItem.create({
    data: {
      productName: productName.trim(),
      originalQuantity: qty,
      remainingQuantity: qty,
      packageId: id,
    },
    include: { utilizations: true },
  })

  await writeLog({
    type: "INVENTORY_ITEM_CREATED",
    message: `Item "${item.productName}" (qty ${qty}) added to "${pkg.name}"`,
    userId: session.user.id,
    inventoryPackageId: id,
  })

  return NextResponse.json(item, { status: 201 })
}
