import { NextRequest, NextResponse } from "next/server"
import { readUploadedFile, serveFile } from "@/shared/lib/upload"
import { EXCEL_MIMES, WORD_DOCX_MIME } from "@/shared/lib/file-types"
import { serveExcelSheetList, serveExcelSheetPdf, serveWordPreview } from "@/shared/lib/excel-preview"

interface DocRecord {
  filename: string
  mimeType: string
  originalName: string
}

/** Handles preview and inline/download serving for a stored document. */
export async function serveDocumentResponse(req: NextRequest, doc: DocRecord): Promise<NextResponse> {
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
