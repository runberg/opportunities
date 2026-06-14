import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { serveFile, deleteUploadedFile } from "@/shared/lib/upload"

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error

  const { id } = await params
  const doc = await db.adhocDocument.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return serveFile(doc)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session

  const { id } = await params
  const doc = await db.adhocDocument.findUnique({
    where: { id },
    include: { deliverable: true },
  })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (doc.uploadedById !== session.user.id && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (doc.deliverable.status === "DELIVERED" && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can edit a delivered work package" }, { status: 403 })

  await deleteUploadedFile(doc.filename)
  await db.adhocDocument.delete({ where: { id } })

  await writeLog({
    type: "ADHOC_DOCUMENT_DELETED",
    message: `"${doc.displayName}" (${doc.type}) deleted from "${doc.deliverable.title}"`,
    userId: session.user.id,
    adhocDeliverableId: doc.deliverableId,
  })

  return NextResponse.json({ ok: true })
}
