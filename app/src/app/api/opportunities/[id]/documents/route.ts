import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"
import { DocumentType, DocumentStatus } from "@prisma/client"
import { DOC_TYPE_LABELS } from "@/shared/lib/utils"
import { saveUploadedFile, ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/shared/lib/upload"

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id: opportunityId } = await params

  const opportunity = await db.opportunity.findUnique({ where: { id: opportunityId } })
  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const formData = await req.formData()
  const file = formData.get("file") as File | null
  const displayName = formData.get("displayName") as string | null
  const typeRaw = (formData.get("type") as string | null) ?? "OTHER"
  const docStatusRaw = (formData.get("docStatus") as string | null) ?? "DRAFT"

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!displayName?.trim()) return NextResponse.json({ error: "Document name is required" }, { status: 400 })
  if (!Object.values(DocumentType).includes(typeRaw as DocumentType))
    return NextResponse.json({ error: "Invalid document type" }, { status: 400 })
  if (!Object.values(DocumentStatus).includes(docStatusRaw as DocumentStatus))
    return NextResponse.json({ error: "Invalid document status" }, { status: 400 })
  if (file.size > MAX_UPLOAD_BYTES)
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 400 })
  if (!ALLOWED_MIME_TYPES.has(file.type))
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 })

  const type = typeRaw as DocumentType
  const docStatus = docStatusRaw as DocumentStatus
  const { filename, originalName } = await saveUploadedFile(file)

  const document = await db.document.create({
    data: {
      displayName: displayName.trim(),
      filename,
      originalName,
      mimeType: file.type,
      size: file.size,
      type,
      docStatus,
      uploadedById: session.user.id,
      opportunityId,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  })

  await db.comment.create({
    data: {
      content: `"${displayName.trim()}" uploaded (${DOC_TYPE_LABELS[type] ?? "Document"})`,
      system: true,
      opportunityId,
      authorId: session.user.id,
    },
  })

  return NextResponse.json(document, { status: 201 })
}
