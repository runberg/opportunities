const GOTENBERG_URL = process.env.GOTENBERG_URL ?? "http://gotenberg:3000" // NOSONAR — internal Docker network, http is correct

/**
 * Converts a document to PDF via the Gotenberg LibreOffice route.
 * The filename extension determines the input format (e.g. ".docx", ".xlsx").
 */
export async function convertToPdf(filename: string, fileBuffer: Buffer): Promise<Buffer> {
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength,
  ) as ArrayBuffer
  const form = new FormData()
  form.append("files", new Blob([arrayBuffer]), filename)

  const res = await fetch(`${GOTENBERG_URL}/forms/libreoffice/convert`, {
    method: "POST",
    body: form,
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => "")
    const detailSuffix = detail ? `: ${detail}` : ""
    throw new Error(`Gotenberg conversion failed (${res.status})${detailSuffix}`)
  }

  return Buffer.from(await res.arrayBuffer())
}
