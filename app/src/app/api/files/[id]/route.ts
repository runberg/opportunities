import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"
import { unlink } from "node:fs/promises"
import { join, basename } from "node:path"
import { DOC_TYPE_LABELS } from "@/shared/lib/utils"
import { serveFile, readUploadedFile, UPLOAD_DIR } from "@/shared/lib/upload"
import { EXCEL_MIMES, WORD_DOCX_MIME } from "@/shared/lib/file-types"
import { serveExcelSheetList, serveExcelSheetPdf, serveWordPreview } from "@/shared/lib/excel-preview"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireSession()
  if (error) return error

  const { id } = await params
  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (req.nextUrl.searchParams.get("preview") === "1") {
    const buffer = await readUploadedFile(doc.filename)
    if (!buffer) return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    if (doc.mimeType === WORD_DOCX_MIME) return serveWordPreview(doc.filename, buffer)
    if (EXCEL_MIMES.has(doc.mimeType)) {
      const sheet = req.nextUrl.searchParams.get("sheet")
      if (sheet === null) return serveExcelSheetList(buffer)
      return serveExcelSheetPdf(doc.filename, buffer, Number.parseInt(sheet, 10))
    }
    return NextResponse.json({ error: "Preview not available for this file type" }, { status: 400 })
  }

  const inline = req.nextUrl.searchParams.get("inline") === "1"
  return serveFile(doc, inline)
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
