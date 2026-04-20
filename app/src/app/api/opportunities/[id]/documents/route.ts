import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireSession } from "@/lib/api"
import { writeFile, mkdir } from "fs/promises"
import { join } from "path"
import { v4 as uuidv4 } from "uuid"

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? join(process.cwd(), "uploads")
const MAX_SIZE_BYTES = 50 * 1024 * 1024 // 50 MB

const ALLOWED_MIME_TYPES = [
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
  "text/plain",
  "text/csv",
]

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
  const type = (formData.get("type") as string | null) ?? "OTHER"
  const docStatus = (formData.get("docStatus") as string | null) ?? "DRAFT"

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 })
  if (!displayName?.trim()) {
    return NextResponse.json({ error: "Document name is required" }, { status: 400 })
  }
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 400 })
  }
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
  }

  // Ensure upload directory exists
  await mkdir(UPLOAD_DIR, { recursive: true })

  // Generate unique filename preserving extension
  const ext = file.name.split(".").pop() ?? "bin"
  const filename = `${uuidv4()}.${ext}`
  const filePath = join(UPLOAD_DIR, filename)

  const bytes = await file.arrayBuffer()
  await writeFile(filePath, Buffer.from(bytes))

  const document = await db.document.create({
    data: {
      displayName: displayName.trim(),
      filename,
      originalName: file.name,
      mimeType: file.type,
      size: file.size,
      type: type as never,
      docStatus: docStatus as never,
      uploadedById: session.user.id,
      opportunityId,
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  })

  // System event
  await db.comment.create({
    data: {
      content: `"${displayName.trim()}" uploaded (${type === "QUOTE" ? "Quote" : type === "EL" ? "EL" : "Document"})`,
      system: true,
      opportunityId,
    },
  })

  return NextResponse.json(document, { status: 201 })
}
