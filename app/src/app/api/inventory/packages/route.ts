import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { findAllPackages } from "../_helpers"

export async function GET() {
  const result = await requireSession()
  if (result.error) return result.error
  if (!hasSectionAccess(result.session, "inventory", "READ_ONLY"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  return NextResponse.json(await findAllPackages())
}

export async function POST(req: NextRequest) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session
  if (!hasSectionAccess(session, "inventory", "FULL"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const { name, comment, opportunityId } = body

  if (!name || typeof name !== "string" || name.trim() === "")
    return NextResponse.json({ error: "Name is required" }, { status: 400 })

  if (opportunityId) {
    const opportunity = await db.opportunity.findUnique({ where: { id: opportunityId } })
    if (!opportunity) return NextResponse.json({ error: "Opportunity not found" }, { status: 400 })
  }

  const pkg = await db.inventoryPackage.create({
    data: {
      name: name.trim(),
      comment: typeof comment === "string" ? comment.trim() || null : null,
      opportunityId: opportunityId || null,
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true, customer: true, internalId: true } },
      items: { include: { utilizations: { include: { createdBy: { select: { id: true, name: true } } } } } },
    },
  })

  await writeLog({
    type: "INVENTORY_PACKAGE_CREATED",
    message: `Inventory package "${pkg.name}" created`,
    userId: session.user.id,
    inventoryPackageId: pkg.id,
  })

  return NextResponse.json(pkg, { status: 201 })
}
