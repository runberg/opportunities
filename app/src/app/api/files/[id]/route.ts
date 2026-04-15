import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { readFile, unlink } from "fs/promises"
import { join, extname } from "path"
import { existsSync } from "fs"

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads")

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const filePath = join(UPLOAD_DIR, doc.filename)
  if (!existsSync(filePath)) {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
  }

  const buffer = await readFile(filePath)

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${encodeURIComponent(doc.originalName)}"`,
      "Content-Length": buffer.length.toString(),
    },
  })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id } = await params

  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  // Only uploader or admin can delete
  if (doc.uploadedById !== session.user.id && session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Delete file from disk
  const filePath = join(UPLOAD_DIR, doc.filename)
  try {
    if (existsSync(filePath)) await unlink(filePath)
  } catch {
    // Continue even if file is missing from disk
  }

  await db.document.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}
