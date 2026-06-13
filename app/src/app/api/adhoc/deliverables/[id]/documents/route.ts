import { NextRequest, NextResponse } from "next/server"
import { join } from "path"
import { writeFile } from "fs/promises"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { AdhocDocumentType } from "@prisma/client"

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads")
const MAX_SIZE = 50 * 1024 * 1024

const ALLOWED_MIME = new Set([
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

const VALID_TYPES = Object.values(AdhocDocumentType)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session

  const { id } = await params
  const deliverable = await db.adhocDeliverable.findUnique({ where: { id } })
  if (!deliverable) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (deliverable.status === "DELIVERED" && session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can edit a delivered work package" }, { status: 403 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const displayName = formData.get("displayName") as string | null
  const typeRaw = (formData.get("type") as string | null) ?? "BUDGET"
  const notes = (formData.get("notes") as string | null)?.trim() || null

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!displayName?.trim()) return NextResponse.json({ error: "Display name is required" }, { status: 400 })
  if (!VALID_TYPES.includes(typeRaw as AdhocDocumentType))
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 })
  if (!ALLOWED_MIME.has(file.type))
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 400 })

  const originalName = file.name
  const ext = originalName.includes(".") ? originalName.split(".").pop()! : "bin"
  const filename = `${uuidv4()}.${ext}`
  const bytes = await file.arrayBuffer()
  await writeFile(join(UPLOAD_DIR, filename), Buffer.from(bytes))

  const doc = await db.adhocDocument.create({
    data: {
      displayName: displayName.trim(),
      filename,
      originalName,
      mimeType: file.type,
      size: file.size,
      type: typeRaw as AdhocDocumentType,
      notes,
      deliverableId: id,
      uploadedById: session.user.id,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  })

  await writeLog({
    type: "ADHOC_DOCUMENT_UPLOADED",
    message: `"${doc.displayName}" (${typeRaw}) uploaded to "${deliverable.title}"`,
    userId: session.user.id,
    adhocDeliverableId: id,
  })

  return NextResponse.json(doc, { status: 201 })
}
