import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { saveUploadedFile } from "@/shared/lib/upload"
import { findAllPackages, parsePackageForm } from "../_helpers"

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

  const parsed = await parsePackageForm(await req.formData())
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { name, comment, opportunityId, file } = parsed

  const saved = file && file.size > 0 ? await saveUploadedFile(file) : null

  const pkg = await db.inventoryPackage.create({
    data: {
      name,
      comment,
      opportunityId,
      createdById: session.user.id,
      filename: saved?.filename ?? null,
      originalName: saved?.originalName ?? null,
      mimeType: saved && file ? file.type : null,
      size: saved && file ? file.size : null,
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
