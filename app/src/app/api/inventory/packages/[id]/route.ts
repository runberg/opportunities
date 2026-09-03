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
  const pkg = await db.inventoryPackage.findUnique({ where: { id } })
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const { name, comment, opportunityId } = body

  if (name !== undefined && (typeof name !== "string" || name.trim() === ""))
    return NextResponse.json({ error: "Name is required" }, { status: 400 })

  if (opportunityId) {
    const opportunity = await db.opportunity.findUnique({ where: { id: opportunityId } })
    if (!opportunity) return NextResponse.json({ error: "Opportunity not found" }, { status: 400 })
  }

  const updated = await db.inventoryPackage.update({
    where: { id },
    data: {
      ...(name !== undefined && { name: name.trim() }),
      ...(comment !== undefined && { comment: typeof comment === "string" ? comment.trim() || null : null }),
      ...(opportunityId !== undefined && { opportunityId: opportunityId || null }),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true, customer: true, internalId: true } },
      items: { include: { utilizations: { include: { createdBy: { select: { id: true, name: true } } } } } },
    },
  })

  await writeLog({
    type: "INVENTORY_PACKAGE_UPDATED",
    message: `Inventory package "${updated.name}" updated`,
    userId: session.user.id,
    inventoryPackageId: id,
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
  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const { id } = await params
  const pkg = await db.inventoryPackage.findUnique({ where: { id } })
  if (!pkg) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await db.inventoryPackage.delete({ where: { id } })

  await writeLog({
    type: "INVENTORY_PACKAGE_DELETED",
    message: `Inventory package "${pkg.name}" deleted`,
    userId: session.user.id,
  })

  return NextResponse.json({ ok: true })
}
