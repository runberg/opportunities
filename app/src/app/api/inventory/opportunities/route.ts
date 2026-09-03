import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"

const RESULT_LIMIT = 20

/**
 * Minimal opportunity search for the Inventory module's opportunity picker.
 * Gated by Inventory access (not Opportunities access) — linking a package to an
 * opportunity is an Inventory-context action, so it shouldn't require the caller
 * to also have Opportunities section access. Searches across every status.
 */
export async function GET(req: NextRequest) {
  const result = await requireSession()
  if (result.error) return result.error
  if (!hasSectionAccess(result.session, "inventory", "READ_ONLY"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return NextResponse.json({ items: [] })

  const items = await db.opportunity.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { customer: { contains: q, mode: "insensitive" } },
        { internalId: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, title: true, customer: true, internalId: true },
    orderBy: { updatedAt: "desc" },
    take: RESULT_LIMIT,
  })

  return NextResponse.json({ items })
}
