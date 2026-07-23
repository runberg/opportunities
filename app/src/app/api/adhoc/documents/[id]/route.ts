import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { deleteUploadedFile } from "@/shared/lib/upload"
import { serveDocumentResponse } from "@/shared/lib/serve-doc"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  if (!hasSectionAccess(result.session, "adhoc", "READ_ONLY"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const doc = await db.adhocDocument.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return serveDocumentResponse(req, doc)
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

  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can delete documents" }, { status: 403 })

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
