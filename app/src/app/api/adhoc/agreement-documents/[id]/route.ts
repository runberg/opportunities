import { NextRequest, NextResponse } from "next/server"
import { join, basename } from "node:path"
import { readFile, unlink } from "node:fs/promises"
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
  const doc = await db.adhocAgreementDocument.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

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
  const doc = await db.adhocAgreementDocument.findUnique({
    where: { id },
    include: { agreement: true },
  })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (doc.uploadedById !== session.user.id && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const safeName = basename(doc.filename)
  try {
    await unlink(join(UPLOAD_DIR, safeName))
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
  }

  await db.adhocAgreementDocument.delete({ where: { id } })

  await writeLog({
    type: "ADHOC_AGREEMENT_DOCUMENT_DELETED",
    message: `"${doc.displayName}" (${doc.type}) deleted from agreement "${doc.agreement.title}"`,
    userId: session.user.id,
  })

  return NextResponse.json({ ok: true })
}
