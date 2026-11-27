import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"

const RESULT_LIMIT = 20

const searchSchema = z.string().trim().min(2)
export async function GET(req: NextRequest) {
  const result = await requireSession()
  if (result.error) return result.error
  if (!hasSectionAccess(result.session, "inventory", "READ_ONLY"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const query = searchSchema.safeParse(req.nextUrl.searchParams.get("q"))
  if (!query.success) return NextResponse.json({ items: [] })

  const q = query.data
  const items = await db.adhocDeliverable.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { customer: { contains: q, mode: "insensitive" } },
        { internalId: { contains: q, mode: "insensitive" } },
        { deliveryNoteRef: { contains: q, mode: "insensitive" } },
        { agreement: { title: { contains: q, mode: "insensitive" } } },
      ],
    },
    select: { id: true, title: true, customer: true, internalId: true, status: true, agreement: { select: { title: true } } },
    orderBy: { updatedAt: "desc" },
    take: RESULT_LIMIT,
  })

  return NextResponse.json({
    items: items.map(({ agreement, customer, ...item }) => ({
      ...item,
      customer: [customer, agreement.title].filter(Boolean).join(" · "),
    })),
  })
}
