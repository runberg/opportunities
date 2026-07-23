import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { unlink } from "node:fs/promises"
import { join, basename } from "node:path"
import { DOC_TYPE_LABELS } from "@/shared/lib/utils"
import { UPLOAD_DIR } from "@/shared/lib/upload"
import { serveDocumentResponse } from "@/shared/lib/serve-doc"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error
  if (!hasSectionAccess(session, "opportunities", "READ_ONLY"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return serveDocumentResponse(req, doc)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id } = await params
  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can delete documents" }, { status: 403 })

  await db.comment.create({
    data: {
      content: `"${doc.displayName}" deleted (${DOC_TYPE_LABELS[doc.type] ?? "Document"})`,
      system: true,
      opportunityId: doc.opportunityId,
      authorId: session.user.id,
    },
  })

  const filePath = join(UPLOAD_DIR, basename(doc.filename))
  try {
    await unlink(filePath)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
  }

  await db.document.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
