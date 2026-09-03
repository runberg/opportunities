import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { QUOTE_STATUSES, EL_STATUSES, PRODUCTION_STATUSES, STATUS_LABELS } from "@/shared/lib/utils"

const RESULT_LIMIT = 8

function opportunityGroup(status: string): string {
  if ((QUOTE_STATUSES as readonly string[]).includes(status)) return "Quote"
  if ((EL_STATUSES as readonly string[]).includes(status)) return "Engagement Letter"
  if ((PRODUCTION_STATUSES as readonly string[]).includes(status)) return "Production"
  return STATUS_LABELS[status] ?? status
}

function opportunityBasePath(status: string): string {
  if ((EL_STATUSES as readonly string[]).includes(status)) return "/els"
  if ((PRODUCTION_STATUSES as readonly string[]).includes(status)) return "/production"
  return "/opportunities"
}

async function searchOpportunities(q: string) {
  const items = await db.opportunity.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { customer: { contains: q, mode: "insensitive" } },
        { reference: { contains: q, mode: "insensitive" } },
        { internalId: { contains: q, mode: "insensitive" } },
        { product: { contains: q, mode: "insensitive" } },
      ],
    },
    select: { id: true, internalId: true, title: true, customer: true, status: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: RESULT_LIMIT,
  })

  return items.map((o) => ({
    id: o.id,
    title: o.title,
    subtitle: o.customer,
    internalId: o.internalId,
    status: o.status as string,
    group: opportunityGroup(o.status),
    basePath: opportunityBasePath(o.status),
  }))
}

async function searchAdhoc(q: string) {
  const deliverables = await db.adhocDeliverable.findMany({
    where: {
      OR: [
        { title: { contains: q, mode: "insensitive" } },
        { internalId: { contains: q, mode: "insensitive" } },
        { deliveryNoteRef: { contains: q, mode: "insensitive" } },
      ],
    },
    select: {
      id: true, internalId: true, title: true, status: true, deliveryNoteRef: true,
      agreement: { select: { id: true, title: true } },
    },
    orderBy: { updatedAt: "desc" },
    take: RESULT_LIMIT,
  })

  return deliverables.map((d) => ({
    id: d.id,
    title: d.title,
    subtitle: d.deliveryNoteRef ? `${d.agreement.title} · DN ${d.deliveryNoteRef}` : d.agreement.title,
    status: d.status as string,
    href: `/adhoc?agreement=${d.agreement.id}&deliverable=${d.id}`,
  }))
}

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? ""
  if (q.length < 2) return NextResponse.json({ opportunities: [], adhoc: [] })

  const canSearchOpportunities = hasSectionAccess(session, "opportunities", "READ_ONLY")
  const canSearchAdhoc = hasSectionAccess(session, "adhoc", "READ_ONLY")

  const [opportunities, adhoc] = await Promise.all([
    canSearchOpportunities ? searchOpportunities(q) : Promise.resolve([]),
    canSearchAdhoc ? searchAdhoc(q) : Promise.resolve([]),
  ])

  return NextResponse.json({ opportunities, adhoc })
}
