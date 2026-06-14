import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { AdhocAgreementDocumentType } from "@prisma/client"
import { saveUploadedFile, ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/shared/lib/upload"

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
  if (!ALLOWED_MIME_TYPES.has(file.type))
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
  if (file.size > MAX_UPLOAD_BYTES)
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 400 })

  const { filename, originalName } = await saveUploadedFile(file)

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
