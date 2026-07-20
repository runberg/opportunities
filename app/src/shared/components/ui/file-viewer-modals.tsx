"use client"

import { PdfViewerModal } from "./pdf-viewer-modal"
import { ExcelViewerModal } from "./excel-viewer-modal"
import { WordViewerModal } from "./word-viewer-modal"
import type { FileViewers } from "@/shared/lib/use-file-viewer"

interface FileViewerModalsProps {
  readonly viewers: FileViewers
  readonly urlFor: (id: string) => string
}

export function FileViewerModals({ viewers, urlFor }: FileViewerModalsProps) {
  return (
    <>
      {viewers.pdfViewer && (
        <PdfViewerModal
          fileUrl={urlFor(viewers.pdfViewer.id)}
          docName={viewers.pdfViewer.name}
          onClose={() => viewers.setPdfViewer(null)}
        />
      )}
      {viewers.excelViewer && (
        <ExcelViewerModal
          fileUrl={urlFor(viewers.excelViewer.id)}
          docName={viewers.excelViewer.name}
          onClose={() => viewers.setExcelViewer(null)}
        />
      )}
      {viewers.wordViewer && (
        <WordViewerModal
          fileUrl={urlFor(viewers.wordViewer.id)}
          docName={viewers.wordViewer.name}
          onClose={() => viewers.setWordViewer(null)}
        />
      )}
    </>
  )
}
