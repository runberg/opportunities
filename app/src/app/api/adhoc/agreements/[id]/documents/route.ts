import { NextRequest, NextResponse } from "next/server"
import { join } from "path"
import { writeFile } from "fs/promises"
import { v4 as uuidv4 } from "uuid"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { AdhocAgreementDocumentType } from "@prisma/client"

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

const VALID_TYPES = Object.values(AdhocAgreementDocumentType)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session

  const { id } = await params
  const agreement = await db.adhocAgreement.findUnique({ where: { id } })
  if (!agreement) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const displayName = formData.get("displayName") as string | null
  const typeRaw = (formData.get("type") as string | null) ?? "DRAFT"
  const notes = (formData.get("notes") as string | null)?.trim() || null

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!displayName?.trim()) return NextResponse.json({ error: "Display name is required" }, { status: 400 })
  if (!VALID_TYPES.includes(typeRaw as AdhocAgreementDocumentType))
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

  const doc = await db.adhocAgreementDocument.create({
    data: {
      displayName: displayName.trim(),
      filename,
      originalName,
      mimeType: file.type,
      size: file.size,
      type: typeRaw as AdhocAgreementDocumentType,
      notes,
      agreementId: id,
      uploadedById: session.user.id,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  })

  await writeLog({
    type: "ADHOC_AGREEMENT_DOCUMENT_UPLOADED",
    message: `"${doc.displayName}" (${typeRaw}) uploaded to agreement "${agreement.title}"`,
    userId: session.user.id,
  })

  return NextResponse.json(doc, { status: 201 })
}
