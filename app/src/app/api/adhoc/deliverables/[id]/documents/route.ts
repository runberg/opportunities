import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { AdhocDocumentType } from "@prisma/client"
import { saveUploadedFile, ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES } from "@/shared/lib/upload"
import { scheduleNotification } from "@/shared/lib/notify"

const VALID_TYPES = Object.values(AdhocDocumentType)

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session
  if (!hasSectionAccess(session, "adhoc", "FULL"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

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
  if (!ALLOWED_MIME_TYPES.has(file.type))
    return NextResponse.json({ error: "File type not allowed" }, { status: 400 })
  if (file.size > MAX_UPLOAD_BYTES)
    return NextResponse.json({ error: "File exceeds 50 MB limit" }, { status: 400 })

  const { filename, originalName } = await saveUploadedFile(file)

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

  scheduleNotification({
    module: "adhoc",
    itemId: id,
    actorId: session.user.id,
    title: deliverable.title,
    changes: [`"${doc.displayName}" (${typeRaw}) uploaded`],
    statusChanges: [],
  }).catch((err) => console.error("Failed to schedule notification:", err))

  return NextResponse.json(doc, { status: 201 })
}
