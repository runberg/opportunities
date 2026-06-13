import { NextRequest, NextResponse } from "next/server"
import { join, basename } from "path"
import { readFile, unlink } from "fs/promises"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads")

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error

  const { id } = await params
  const doc = await db.adhocDocument.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // basename prevents path traversal
  const safeName = basename(doc.filename)
  const filePath = join(UPLOAD_DIR, safeName)

  let bytes: Buffer
  try {
    bytes = await readFile(filePath)
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
  }

  return new NextResponse(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.originalName}"`,
      "Content-Length": String(bytes.length),
    },
  })
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

  // Only uploader or admin may delete
  if (doc.uploadedById !== session.user.id && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  if (doc.deliverable.status === "DELIVERED" && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can edit a delivered work package" }, { status: 403 })

  const safeName = basename(doc.filename)
  try {
    await unlink(join(UPLOAD_DIR, safeName))
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
  }

  await db.adhocDocument.delete({ where: { id } })

  await writeLog({
    type: "ADHOC_DOCUMENT_DELETED",
    message: `"${doc.displayName}" (${doc.type}) deleted from "${doc.deliverable.title}"`,
    userId: session.user.id,
    adhocDeliverableId: doc.deliverableId,
  })

  return NextResponse.json({ ok: true })
}
