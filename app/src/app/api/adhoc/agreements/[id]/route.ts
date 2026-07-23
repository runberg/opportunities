import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { AdhocAgreementStatus, SystemLogType } from "@prisma/client"

const VALID_STATUSES = Object.values(AdhocAgreementStatus)

function resolveSignedDate(signingNow: boolean, signedDate: unknown): Date | undefined {
  if (!signingNow) return undefined
  if (typeof signedDate === "string" && signedDate) return new Date(signedDate)
  return new Date()
}

function buildLogMessage(signingNow: boolean, title: string, signedOn: Date | undefined, changes: string[]): string {
  if (signingNow && signedOn) {
    return `Agreement "${title}" signed (${signedOn.toISOString().split("T")[0]})`
  }
  const suffix = changes.length > 0 ? `: ${changes.join(", ")}` : ""
  return `Agreement "${title}" updated${suffix}`
}

function validatePatch(body: Record<string, unknown>): string | null {
  const { title, totalAmount, status } = body
  if (title !== undefined && (typeof title !== "string" || title.trim() === ""))
    return "Title cannot be empty"
  if (status !== undefined && !VALID_STATUSES.includes(status as AdhocAgreementStatus))
    return "Invalid status"
  if (totalAmount !== undefined && (Number.isNaN(Number(totalAmount)) || Number(totalAmount) <= 0))
    return "Total amount must be positive"
  return null
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session

  if (session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const { id } = await params
  const agreement = await db.adhocAgreement.findUnique({ where: { id } })
  if (!agreement) return NextResponse.json({ error: "Not found" }, { status: 404 })

  await writeLog({
    type: "ADHOC_AGREEMENT_UPDATED",
    message: `Agreement "${agreement.title}" deleted by admin`,
    userId: session.user.id,
  })

  // Deliverables have no cascade from agreement — delete them first (cascades their line items and documents)
  await db.adhocDeliverable.deleteMany({ where: { agreementId: id } })
  await db.adhocAgreement.delete({ where: { id } })

  return NextResponse.json({ ok: true })
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session
  if (!hasSectionAccess(session, "adhoc", "FULL"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const { id } = await params
  const agreement = await db.adhocAgreement.findUnique({ where: { id } })
  if (!agreement) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const body = await req.json()
  const validationError = validatePatch(body)
  if (validationError) return NextResponse.json({ error: validationError }, { status: 400 })

  const { title, totalAmount, status, signedDate } = body
  const signingNow = status === "SIGNED" && agreement.status !== "SIGNED"
  const resolvedSignedDate = resolveSignedDate(signingNow, signedDate)

  const updated = await db.adhocAgreement.update({
    where: { id },
    data: {
      ...(title !== undefined && { title: (title as string).trim() }),
      ...(totalAmount !== undefined && { totalAmount: Number(totalAmount) }),
      ...(status !== undefined && { status: status as AdhocAgreementStatus }),
      ...(resolvedSignedDate !== undefined && { signedDate: resolvedSignedDate }),
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      documents: {
        orderBy: { uploadedAt: "asc" },
        include: { uploadedBy: { select: { id: true, name: true } } },
      },
    },
  })

  const changes: string[] = []
  if (status && status !== agreement.status) changes.push(`status → ${status}`)
  if (title && (title as string).trim() !== agreement.title) changes.push(`title → "${(title as string).trim()}"`)
  if (totalAmount && Number(totalAmount) !== Number(agreement.totalAmount))
    changes.push(`amount → ${totalAmount}`)

  const logType: SystemLogType = signingNow ? "ADHOC_AGREEMENT_SIGNED" : "ADHOC_AGREEMENT_UPDATED"
  await writeLog({
    type: logType,
    message: buildLogMessage(signingNow, updated.title, resolvedSignedDate, changes),
    userId: session.user.id,
  })

  return NextResponse.json(updated)
}
