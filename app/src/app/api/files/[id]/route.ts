import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireSession } from "@/lib/api"
import { readFile, unlink } from "fs/promises"
import { join, basename } from "node:path"
import { DOC_TYPE_LABELS } from "@/lib/utils"

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads")

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSession()
  if (error) return error

  const { id } = await params

  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const filePath = join(UPLOAD_DIR, basename(doc.filename))
  const buffer = await readFile(filePath).catch(() => null)
  if (!buffer) return NextResponse.json({ error: "File not found on disk" }, { status: 404 })

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.originalName)}"`,
      "Content-Length": buffer.length.toString(),
    },
  })
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

  // Only uploader or admin can delete
  if (doc.uploadedById !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

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
