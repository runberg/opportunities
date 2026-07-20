import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { serveFile, readUploadedFile, deleteUploadedFile } from "@/shared/lib/upload"
import { EXCEL_MIMES } from "@/shared/lib/file-types"
import { serveExcelPreview } from "@/shared/lib/excel-preview"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error

  const { id } = await params
  const doc = await db.adhocAgreementDocument.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (req.nextUrl.searchParams.get("preview") === "1") {
    if (!EXCEL_MIMES.has(doc.mimeType))
      return NextResponse.json({ error: "Not an Excel file" }, { status: 400 })
    const buffer = await readUploadedFile(doc.filename)
    if (!buffer) return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
    return serveExcelPreview(buffer)
  }

  const inline = req.nextUrl.searchParams.get("inline") === "1"
  return serveFile(doc, inline)
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

  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can delete documents" }, { status: 403 })

  await deleteUploadedFile(doc.filename)
  await db.adhocAgreementDocument.delete({ where: { id } })

  await writeLog({
    type: "ADHOC_AGREEMENT_DOCUMENT_DELETED",
    message: `"${doc.displayName}" (${doc.type}) deleted from agreement "${doc.agreement.title}"`,
    userId: session.user.id,
  })

  return NextResponse.json({ ok: true })
}
