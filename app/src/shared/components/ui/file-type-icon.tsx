export function FileTypeIcon({ mimeType }: Readonly<{ mimeType: string }>) {
  let label: string
  let body: string
  let fold: string
  let text: string

  if (mimeType === "application/pdf") {
    label = "PDF"; body = "#fee2e2"; fold = "#fca5a5"; text = "#dc2626"
  } else if (mimeType.includes("spreadsheet") || mimeType.includes("excel") || mimeType === "text/csv") {
    label = "XLS"; body = "#dcfce7"; fold = "#86efac"; text = "#16a34a"
  } else if (mimeType.includes("word") || mimeType.includes("wordprocessing") || mimeType.includes("document")) {
    label = "DOC"; body = "#dbeafe"; fold = "#93c5fd"; text = "#2563eb"
  } else if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) {
    label = "PPT"; body = "#e2e2e2"; fold = "#c4c4c4"; text = "#555555"
  } else if (mimeType.startsWith("image/")) {
    label = "IMG"; body = "#e2e2e2"; fold = "#c4c4c4"; text = "#555555"
  } else {
    label = "FILE"; body = "#e2e2e2"; fold = "#c4c4c4"; text = "#555555"
  }

  return (
    <svg viewBox="0 0 20 24" width="18" height="22" aria-hidden="true" className="shrink-0 mt-0.5">
      <path d="M2 0h12l6 6v16a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z" fill={body} stroke={fold} strokeWidth="0.5" />
      <path d="M14 0l6 6h-6V0z" fill={fold} />
      <text x="10" y="17.5" textAnchor="middle" fontSize={label.length > 3 ? "4" : "5"} fontWeight="700" fontFamily="system-ui,-apple-system,sans-serif" fill={text} letterSpacing="0.3">{label}</text>
    </svg>
  )
}
