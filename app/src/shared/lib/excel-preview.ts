import ExcelJS from "exceljs"
import { NextResponse } from "next/server"
import { basename, extname } from "node:path"
import { convertToPdf } from "@/shared/lib/gotenberg"

export type SheetInfo = { name: string; index: number }

// ─── Sheet metadata ───────────────────────────────────────────────────────────

/** Returns the name and index of every worksheet in the workbook. */
export async function getSheetNames(buffer: Buffer): Promise<SheetInfo[]> {
  const arrayBuffer = toArrayBuffer(buffer)
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.load(arrayBuffer)
  return wb.worksheets.map((ws, i) => ({ name: ws.name, index: i }))
}

// ─── Single-sheet extraction ──────────────────────────────────────────────────

/**
 * Copies the target worksheet into a new single-sheet workbook and returns it
 * as an xlsx buffer. LibreOffice then renders this with full fidelity.
 */
export async function extractSheetBuffer(buffer: Buffer, sheetIndex: number): Promise<Buffer> {
  const arrayBuffer = toArrayBuffer(buffer)

  const srcWb = new ExcelJS.Workbook()
  await srcWb.xlsx.load(arrayBuffer)

  const srcWs = srcWb.worksheets[sheetIndex]
  if (!srcWs) throw new Error(`Sheet index ${sheetIndex} not found`)

  const destWb = new ExcelJS.Workbook()
  const destWs = destWb.addWorksheet(srcWs.name)

  // Column widths and visibility
  srcWs.columns.forEach((col, i) => {
    const destCol = destWs.getColumn(i + 1)
    if (col.width) destCol.width = col.width
    if (col.hidden) destCol.hidden = col.hidden
  })

  // Rows: values, styles, heights
  srcWs.eachRow({ includeEmpty: false }, (row, rowNum) => {
    const destRow = destWs.getRow(rowNum)
    if (row.height) destRow.height = row.height
    if (row.hidden) destRow.hidden = row.hidden
    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const destCell = destRow.getCell(colNum)
      destCell.value = cell.value
      destCell.style = structuredClone(cell.style) as ExcelJS.Style
    })
    destRow.commit()
  })

  // Merged cell ranges
  const merges = (srcWs.model as { merges?: string[] }).merges ?? []
  for (const merge of merges) {
    try { destWs.mergeCells(merge) } catch { /* skip malformed ranges */ }
  }

  return Buffer.from(await destWb.xlsx.writeBuffer())
}

// ─── Response helpers (called from API routes) ────────────────────────────────

/** Returns JSON `{ sheets }` for the Excel tab bar. */
export async function serveExcelSheetList(buffer: Buffer): Promise<NextResponse> {
  try {
    const sheets = await getSheetNames(buffer)
    return NextResponse.json({ sheets })
  } catch {
    return NextResponse.json({ error: "Failed to read Excel file" }, { status: 422 })
  }
}

/** Extracts one sheet and converts it to PDF via Gotenberg. */
export async function serveExcelSheetPdf(
  filename: string,
  buffer: Buffer,
  sheetIndex: number,
): Promise<NextResponse> {
  try {
    const sheetBuffer = await extractSheetBuffer(buffer, sheetIndex)
    const ext = extname(basename(filename)) || ".xlsx"
    const pdfBuffer = await convertToPdf(`sheet${ext}`, sheetBuffer)
    return pdfResponse(pdfBuffer)
  } catch {
    return NextResponse.json({ error: "Failed to convert sheet to PDF" }, { status: 422 })
  }
}

/** Converts a Word document to PDF via Gotenberg. */
export async function serveWordPreview(filename: string, buffer: Buffer): Promise<NextResponse> {
  try {
    const pdfBuffer = await convertToPdf(basename(filename), buffer)
    return pdfResponse(pdfBuffer)
  } catch {
    return NextResponse.json({ error: "Failed to convert document to PDF" }, { status: 422 })
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
}

function pdfResponse(pdfBuffer: Buffer): NextResponse {
  return new NextResponse(pdfBuffer.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline",
      "Content-Length": String(pdfBuffer.length),
    },
  })
}
