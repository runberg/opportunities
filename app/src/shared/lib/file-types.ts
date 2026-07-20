export const EXCEL_MIMES = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

// Only .docx supports in-browser preview; old binary .doc is download-only
export const WORD_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export function isViewableMime(mimeType: string): boolean {
  return mimeType === "application/pdf" || EXCEL_MIMES.has(mimeType) || mimeType === WORD_DOCX_MIME
}
