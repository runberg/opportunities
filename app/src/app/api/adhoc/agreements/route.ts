import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { findAllAgreements } from "../_helpers"

export async function GET() {
  const result = await requireSession()
  if (result.error) return result.error

  return NextResponse.json(await findAllAgreements())
}

export async function POST(req: NextRequest) {
  const result = await requireSession()
  if (result.error) return result.error
  const session = result.session

  const body = await req.json()
  const { title, totalAmount } = body

  if (!title || typeof title !== "string" || title.trim() === "")
    return NextResponse.json({ error: "Title is required" }, { status: 400 })
  if (totalAmount == null || Number.isNaN(Number(totalAmount)) || Number(totalAmount) <= 0)
    return NextResponse.json({ error: "Total amount must be positive" }, { status: 400 })

  const agreement = await db.adhocAgreement.create({
    data: {
      title: title.trim(),
      version: 1,
      totalAmount: Number(totalAmount),
      createdById: session.user.id,
    },
    include: {
      createdBy: { select: { id: true, name: true } },
      documents: true,
    },
  })

  await writeLog({
    type: "ADHOC_AGREEMENT_CREATED",
    message: `Agreement "${agreement.title}" created`,
    userId: session.user.id,
  })

  return NextResponse.json(agreement, { status: 201 })
}
