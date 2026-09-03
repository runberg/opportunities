import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { serveDocumentResponse } from "@/shared/lib/serve-doc"

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  if (!hasSectionAccess(result.session, "inventory", "READ_ONLY"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const utilization = await db.inventoryUtilization.findUnique({ where: { id } })
  if (!utilization?.filename || !utilization.originalName || !utilization.mimeType)
    return NextResponse.json({ error: "No file attached" }, { status: 404 })

  return serveDocumentResponse(req, {
    filename: utilization.filename,
    originalName: utilization.originalName,
    mimeType: utilization.mimeType,
  })
}
