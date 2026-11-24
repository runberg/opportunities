import { Prisma } from "@prisma/client"
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { hasSectionAccess, requireSession } from "@/shared/lib/api"
import { db } from "@/shared/lib/db"
import { writeLog } from "@/shared/lib/system-log"
import { PRE_SALES_EDITABLE_STAGES } from "@/modules/opportunities/pre-sales/types"

const costInput = z.object({
  item: z.string().trim().min(1).max(160),
  estimatedAmount: z.string().trim().regex(/^\d{1,10}(\.\d{1,2})?$/, "Enter a non-negative amount with up to two decimal places."),
  note: z.string().trim().max(500).optional().transform((note) => note || null),
})
const costId = z.string().min(1).max(128)
const actionInput = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), cost: costInput }),
  z.object({ action: z.literal("edit"), costId, cost: costInput }),
  z.object({ action: z.literal("remove"), costId }),
])

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireSession()
  if (error) return error
  if (!hasSectionAccess(session, "opportunities", "FULL")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { id } = await params
  const parsed = actionInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid cost item." }, { status: 400 })

  const change = parsed.data
  try {
    const saved = await db.$transaction(async (tx) => {
      // Lock the opportunity row so a stage transition or archive cannot race a cost edit.
      const updated = await tx.opportunity.updateMany({
        where: { id, isArchived: false, status: { in: [...PRE_SALES_EDITABLE_STAGES] } },
        data: { updatedAt: new Date() },
      })
      if (!updated.count) return false

      if (change.action === "add") {
        await tx.preSalesCost.create({ data: { ...change.cost, opportunityId: id } })
      } else {
        const where = { id: change.costId, opportunityId: id }
        if (change.action === "edit") await tx.preSalesCost.update({ where, data: change.cost })
        else await tx.preSalesCost.delete({ where })
      }

      const verb = { add: "added", edit: "updated", remove: "removed" }[change.action]
      await writeLog({
        type: "OPPORTUNITY_UPDATED", message: `Pre-sales cost item ${verb}.`, userId: session.user.id, opportunityId: id,
      }, tx)
      return true
    })
    if (saved) return NextResponse.json({ ok: true }, { status: change.action === "add" ? 201 : 200 })

    const exists = await db.opportunity.findUnique({ where: { id }, select: { id: true } })
    if (!exists) return NextResponse.json({ error: "Opportunity not found." }, { status: 404 })
    return NextResponse.json({ error: "Pre-sales costs are editable only on active Open or RFQ Received opportunities." }, { status: 409 })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json({ error: "Cost item not found." }, { status: 404 })
    }
    throw error
  }
}
