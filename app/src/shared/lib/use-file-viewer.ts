import { useState } from "react"
import { EXCEL_MIMES, WORD_DOCX_MIME } from "@/shared/lib/file-types"

export type ViewerEntry = { id: string; name: string }

export type FileViewers = {
  pdfViewer: ViewerEntry | null
  setPdfViewer: (v: ViewerEntry | null) => void
  excelViewer: ViewerEntry | null
  setExcelViewer: (v: ViewerEntry | null) => void
  wordViewer: ViewerEntry | null
  setWordViewer: (v: ViewerEntry | null) => void
  openViewer: (doc: { id: string; displayName: string; mimeType: string }) => void
}

export function useFileViewer(): FileViewers {
  const [pdfViewer, setPdfViewer] = useState<ViewerEntry | null>(null)
  const [excelViewer, setExcelViewer] = useState<ViewerEntry | null>(null)
  const [wordViewer, setWordViewer] = useState<ViewerEntry | null>(null)

  function openViewer(doc: { id: string; displayName: string; mimeType: string }) {
    const entry: ViewerEntry = { id: doc.id, name: doc.displayName }
    if (EXCEL_MIMES.has(doc.mimeType)) setExcelViewer(entry)
    else if (doc.mimeType === WORD_DOCX_MIME) setWordViewer(entry)
    else setPdfViewer(entry)
  }

  return { pdfViewer, setPdfViewer, excelViewer, setExcelViewer, wordViewer, setWordViewer, openViewer }
}
