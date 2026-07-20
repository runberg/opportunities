import ExcelJS from "exceljs"
import { NextResponse } from "next/server"

export type SheetPreview = { name: string; html: string }

/** Converts an Excel file buffer to an array of sheet previews (name + HTML table). */
export async function excelToSheets(buffer: Buffer): Promise<SheetPreview[]> {
  // Convert to plain ArrayBuffer to avoid Buffer<ArrayBufferLike> incompatibility with exceljs types
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)
  return workbook.worksheets.map((ws) => ({ name: ws.name, html: worksheetToHtml(ws) }))
}

/** Returns a JSON response with sheet previews, or a 422 on parse failure. */
export async function serveExcelPreview(buffer: Buffer): Promise<NextResponse> {
  try {
    const sheets = await excelToSheets(buffer)
    return NextResponse.json({ sheets })
  } catch {
    return NextResponse.json({ error: "Failed to parse Excel file" }, { status: 422 })
  }
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function parseRef(ref: string): { row: number; col: number } {
  const m = /^([A-Z]+)(\d+)$/.exec(ref.toUpperCase())
  if (!m) return { row: 0, col: 0 }
  let col = 0
  for (const ch of m[1]) col = col * 26 + ((ch.codePointAt(0) ?? 64) - 64)
  return { row: Number.parseInt(m[2], 10), col }
}

function argbToCss(argb?: string): string | undefined {
  if (!argb || argb.length < 6) return undefined
  const rgb = argb.length === 8 ? argb.slice(2) : argb
  if (/^0+$/.test(rgb) || /^f+$/i.test(rgb)) return undefined  // skip default black / white
  return `#${rgb}`
}

function cellStyle(cell: ExcelJS.Cell): string {
  const parts: string[] = [
    "padding:3px 6px",
    "border:1px solid #d1d5db",
    "vertical-align:middle",
    "white-space:nowrap",
  ]

  const font = cell.style?.font
  if (font?.bold) parts.push("font-weight:700")
  if (font?.italic) parts.push("font-style:italic")
  if (font?.size) parts.push(`font-size:${font.size}pt`)
  const fontColor = argbToCss(font?.color?.argb)
  if (fontColor) parts.push(`color:${fontColor}`)

  const fill = cell.style?.fill
  if (fill && "fgColor" in fill && fill.type === "pattern" && fill.pattern !== "none") {
    const bg = argbToCss((fill as ExcelJS.FillPattern).fgColor?.argb)
    if (bg) parts.push(`background:${bg}`)
  }

  const align = cell.style?.alignment
  if (align?.horizontal) parts.push(`text-align:${align.horizontal}`)
  if (align?.wrapText) parts.push("white-space:normal", "word-break:break-word")

  return parts.join(";")
}

// ─── Merge map ────────────────────────────────────────────────────────────────

type MergeData = {
  spanMap: Map<string, { rowspan: number; colspan: number }>
  skipSet: Set<string>
}

function buildMergeData(ws: ExcelJS.Worksheet): MergeData {
  const spanMap = new Map<string, { rowspan: number; colspan: number }>()
  const skipSet = new Set<string>()
  const merges = (ws.model as { merges?: string[] }).merges ?? []

  for (const range of merges) {
    const [startStr, endStr] = range.split(":")
    if (!startStr || !endStr) continue
    const start = parseRef(startStr)
    const end = parseRef(endStr)
    spanMap.set(`${start.row},${start.col}`, {
      rowspan: end.row - start.row + 1,
      colspan: end.col - start.col + 1,
    })
    for (let r = start.row; r <= end.row; r++) {
      for (let c = start.col; c <= end.col; c++) {
        if (r !== start.row || c !== start.col) skipSet.add(`${r},${c}`)
      }
    }
  }

  return { spanMap, skipSet }
}

// ─── Row rendering ────────────────────────────────────────────────────────────

function renderRows(
  ws: ExcelJS.Worksheet,
  rowCount: number,
  colCount: number,
  spanMap: Map<string, { rowspan: number; colspan: number }>,
  skipSet: Set<string>,
): string[] {
  const parts: string[] = []

  for (let r = 1; r <= rowCount; r++) {
    const row = ws.getRow(r)
    const rowStyle = row.height ? `height:${Math.round(row.height * 1.333)}px` : ""
    const rowStyleAttr = rowStyle ? ` style="${rowStyle}"` : ""
    parts.push(`<tr${rowStyleAttr}>`)

    for (let c = 1; c <= colCount; c++) {
      if (skipSet.has(`${r},${c}`)) continue
      const cell = row.getCell(c)
      const span = spanMap.get(`${r},${c}`)
      const spanAttrs = span ? ` colspan="${span.colspan}" rowspan="${span.rowspan}"` : ""
      parts.push(`<td${spanAttrs} style="${cellStyle(cell)}">${escapeHtml(cell.text ?? "")}</td>`)
    }

    parts.push("</tr>")
  }

  return parts
}

// ─── Sheet → HTML ─────────────────────────────────────────────────────────────

function worksheetToHtml(ws: ExcelJS.Worksheet): string {
  const rowCount = ws.actualRowCount
  const colCount = ws.actualColumnCount
  if (rowCount === 0 || colCount === 0) {
    return "<p style='color:#6b7280;padding:16px'>Empty sheet</p>"
  }

  const { spanMap, skipSet } = buildMergeData(ws)

  const colWidths: number[] = []
  for (let c = 1; c <= colCount; c++) {
    colWidths.push(Math.round((ws.getColumn(c).width ?? 8) * 7))
  }

  const colGroup = colWidths.map((w) => `<col style="width:${w}px">`).join("")
  const rows = renderRows(ws, rowCount, colCount, spanMap, skipSet).join("")

  return [
    '<table style="border-collapse:collapse;font-size:13px;font-family:sans-serif;background:#fff">',
    `<colgroup>${colGroup}</colgroup>`,
    `<tbody>${rows}</tbody>`,
    "</table>",
  ].join("")
}

function escapeHtml(s: string): string {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")
}
