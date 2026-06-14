import { writeFile, mkdir } from "node:fs/promises"
import { join } from "node:path"
import { v4 as uuidv4 } from "uuid"

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
