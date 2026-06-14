import { writeFile, readFile, mkdir, unlink } from "node:fs/promises"
import { join, basename } from "node:path"
import { v4 as uuidv4 } from "uuid"
import { NextResponse } from "next/server"

export const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads")
export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024 // 50 MB

export const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "text/plain",
  "text/csv",
])

export interface SavedFile {
  filename: string
  originalName: string
}

/** Reads a file from UPLOAD_DIR and returns a download response. */
export async function serveFile(doc: {
  filename: string
  mimeType: string
  originalName: string
}): Promise<NextResponse> {
  const filePath = join(UPLOAD_DIR, basename(doc.filename))
  let bytes: Buffer
  try {
    bytes = await readFile(filePath)
  } catch {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 })
  }
  return new NextResponse(bytes.buffer as ArrayBuffer, {
    headers: {
      "Content-Type": doc.mimeType,
      "Content-Disposition": `attachment; filename="${doc.originalName}"`,
      "Content-Length": String(bytes.length),
    },
  })
}

/** Deletes a file from UPLOAD_DIR, silently ignoring ENOENT. */
export async function deleteUploadedFile(filename: string): Promise<void> {
  try {
    await unlink(join(UPLOAD_DIR, basename(filename)))
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
  }
}

/** Saves an uploaded File to UPLOAD_DIR with a UUID-based filename. */
export async function saveUploadedFile(file: File): Promise<SavedFile> {
  await mkdir(UPLOAD_DIR, { recursive: true })
  const lastDot = file.name.lastIndexOf(".")
  const ext = (lastDot > 0 ? file.name.slice(lastDot + 1) : "bin").toLowerCase()
  const filename = `${uuidv4()}.${ext}`
  const bytes = await file.arrayBuffer()
  await writeFile(join(UPLOAD_DIR, filename), Buffer.from(bytes))
  return { filename, originalName: file.name }
}
