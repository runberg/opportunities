export const EXCEL_MIMES = new Set([
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
])

// Only .docx supports in-browser preview; old binary .doc is download-only
export const WORD_DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"

export function isViewableMime(mimeType: string): boolean {
  return mimeType === "application/pdf" || EXCEL_MIMES.has(mimeType) || mimeType === WORD_DOCX_MIME
}

// Word (.docx only — old .doc has no in-browser preview), PDF, and Excel — the set of
// types that are always viewable in-app via isViewableMime, so anything uploaded here
// is guaranteed to be openable in the viewer rather than download-only.
export const DELIVERY_NOTE_MIMES = new Set([
  "application/pdf",
  ...EXCEL_MIMES,
  WORD_DOCX_MIME,
])
