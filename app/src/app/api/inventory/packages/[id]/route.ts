import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { saveUploadedFile, deleteUploadedFile } from "@/shared/lib/upload"
import { parsePackageForm } from "../../_helpers"

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

  const formData = await req.formData()
  const parsed = await parsePackageForm(formData)
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 })
  const { name, comment, opportunityId, file } = parsed
  const removeFile = formData.get("removeFile") === "true"

  const saved = file && file.size > 0 ? await saveUploadedFile(file) : null

  const updated = await db.inventoryPackage.update({
    where: { id },
    data: {
      name,
      comment,
      opportunityId,
      ...(saved && { filename: saved.filename, originalName: saved.originalName, mimeType: file!.type, size: file!.size }),
      ...(removeFile && !saved && { filename: null, originalName: null, mimeType: null, size: null }),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true, customer: true, internalId: true } },
      items: { include: { utilizations: { include: { createdBy: { select: { id: true, name: true } } } } } },
    },
  })

  if (pkg.filename && (saved || removeFile)) await deleteUploadedFile(pkg.filename)

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
  if (pkg.filename) await deleteUploadedFile(pkg.filename)

  await writeLog({
    type: "INVENTORY_PACKAGE_DELETED",
    message: `Inventory package "${pkg.name}" deleted`,
    userId: session.user.id,
  })

  return NextResponse.json({ ok: true })
}
