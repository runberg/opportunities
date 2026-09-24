import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { unlink } from "node:fs/promises"
import { join, basename } from "node:path"
import { DOC_TYPE_LABELS } from "@/shared/lib/utils"
import { UPLOAD_DIR } from "@/shared/lib/upload"
import { serveDocumentResponse } from "@/shared/lib/serve-doc"
import { parseDocumentEdit } from "@/shared/lib/document-edit"
import { DocumentType, DocumentStatus } from "@prisma/client"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error
  if (!hasSectionAccess(session, "opportunities", "READ_ONLY"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  return serveDocumentResponse(req, doc)
}

function describeDocumentChanges(
  doc: { displayName: string; type: string; docStatus: string },
  edit: { displayName?: string; type?: string; docStatus?: string }
): string[] {
  const changes: string[] = []
  if (edit.displayName !== undefined && edit.displayName !== doc.displayName)
    changes.push(`renamed to "${edit.displayName}"`)
  if (edit.type !== undefined && edit.type !== doc.type)
    changes.push(`moved from ${DOC_TYPE_LABELS[doc.type] ?? doc.type} to ${DOC_TYPE_LABELS[edit.type] ?? edit.type}`)
  if (edit.docStatus !== undefined && edit.docStatus !== doc.docStatus)
    changes.push(`marked ${edit.docStatus === "FINAL" ? "Final" : "Draft"}`)
  return changes
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error
  if (!hasSectionAccess(session, "opportunities", "FULL"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const edit = parseDocumentEdit(
    await req.json().catch(() => null),
    Object.values(DocumentType) as [string, ...string[]],
    Object.values(DocumentStatus) as [string, ...string[]]
  )
  if (!edit) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const updated = await db.document.update({
    where: { id },
    data: {
      ...(edit.displayName !== undefined && { displayName: edit.displayName }),
      ...(edit.type !== undefined && { type: edit.type as DocumentType }),
      ...(edit.docStatus !== undefined && { docStatus: edit.docStatus as DocumentStatus }),
    },
    include: { uploadedBy: { select: { id: true, name: true } } },
  })

  const changes = describeDocumentChanges(doc, edit)
  if (changes.length > 0) {
    await db.comment.create({
      data: {
        content: `"${doc.displayName}" ${changes.join(", ")}`,
        system: true,
        opportunityId: doc.opportunityId,
        authorId: session.user.id,
      },
    })
  }

  return NextResponse.json(updated)
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireSession()
  if (error) return error

  const { id } = await params
  const doc = await db.document.findUnique({ where: { id } })
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 })

  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Only admins can delete documents" }, { status: 403 })

  await db.comment.create({
    data: {
      content: `"${doc.displayName}" deleted (${DOC_TYPE_LABELS[doc.type] ?? "Document"})`,
      system: true,
      opportunityId: doc.opportunityId,
      authorId: session.user.id,
    },
  })

  const filePath = join(UPLOAD_DIR, basename(doc.filename))
  try {
    await unlink(filePath)
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err
  }

  await db.document.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
