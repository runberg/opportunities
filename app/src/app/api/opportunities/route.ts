import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { z } from "zod"
import { OpportunityStatus, WaitingOn } from "@prisma/client"
import { requireSession, hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"

const createSchema = z.object({
  internalId: z.string().optional(),
  title: z.string().min(1),
  customer: z.string().min(1),
  reference: z.string().optional(),
  rfqDate: z.string().optional(),
  quoteSentDate: z.string().optional(),
  product: z.string().optional(),
  status: z.nativeEnum(OpportunityStatus).optional(),
  waitingOn: z.nativeEnum(WaitingOn).optional(),
  description: z.string().optional(),
})

export async function GET(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error
  if (!hasSectionAccess(session, "opportunities", "READ_ONLY"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const sp = req.nextUrl.searchParams
  const status = sp.get("status") ?? ""
  const q = sp.get("q")?.trim() ?? ""
  const page = Math.max(1, Number.parseInt(sp.get("page") ?? "1", 10) || 1)
  const perPage = Math.min(200, Math.max(10, Number.parseInt(sp.get("perPage") ?? "50", 10) || 50))

  // Date-range filter for chart drill-downs (queries by a specific date field in a range)
  const DATE_FIELDS = ["rfqDate","quoteSentDate","elRequestedDate","elDraftSharedDate",
    "elSignedSharedDate","elCountersignedDate","advancePaymentDate","fatPassedDate","satPassedDate","deliveredDate"]
  const dateField = sp.get("dateField") ?? ""
  const dateFrom = sp.get("dateFrom") ?? ""
  const dateTo = sp.get("dateTo") ?? ""
  const dateCond = dateField && DATE_FIELDS.includes(dateField) && dateFrom && dateTo
    ? { [dateField]: { gte: new Date(dateFrom), lt: new Date(dateTo) } }
    : {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {
    AND: [
      status ? { status } : {},
      dateCond,
      q
        ? {
            OR: [
              { title: { contains: q, mode: "insensitive" as const } },
              { customer: { contains: q, mode: "insensitive" as const } },
              { reference: { contains: q, mode: "insensitive" as const } },
              { internalId: { contains: q, mode: "insensitive" as const } },
              { product: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {},
    ],
  }

  const SORT_FIELDS = [
    "title", "customer", "status", "createdAt", "updatedAt",
    "rfqDate", "quoteSentDate", "elRequestedDate", "elDraftSharedDate",
    "elSignedSharedDate", "elCountersignedDate",
    "advancePaymentDate", "fatPassedDate", "satPassedDate", "deliveredDate",
  ]
  const sortBy = sp.get("sortBy") ?? "updatedAt"
  const sortDir = sp.get("sortDir") === "asc" ? "asc" : ("desc" as const)
  const orderBy = SORT_FIELDS.includes(sortBy) ? { [sortBy]: sortDir } : { updatedAt: "desc" as const }

  const [items, total] = await Promise.all([
    db.opportunity.findMany({
      where,
      select: {
        id: true, internalId: true, title: true, customer: true,
        reference: true, product: true, status: true,
        rfqDate: true, quoteSentDate: true,
        elRequestedDate: true, elDraftSharedDate: true,
        elSignedSharedDate: true, elCountersignedDate: true,
        advancePaymentDate: true, fatPassedDate: true,
        satApplicable: true, satPassedDate: true, deliveredDate: true,
        _count: { select: { comments: true, documents: true } },
      },
      orderBy,
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    db.opportunity.count({ where }),
  ])

  return NextResponse.json({ items, total })
}

export async function DELETE(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const ids: unknown = body.ids
  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: "No IDs provided." }, { status: 400 })
  }
  const stringIds = ids.filter((id): id is string => typeof id === "string")

  const { count } = await db.opportunity.deleteMany({ where: { id: { in: stringIds } } })
  return NextResponse.json({ deleted: count })
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error
  if (!hasSectionAccess(session, "opportunities", "FULL"))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const { internalId, title, customer, reference, rfqDate, quoteSentDate, product, status, waitingOn, description } =
    parsed.data

  try {
    const opportunity = await db.opportunity.create({
      data: {
        internalId: internalId || null,
        title,
        customer,
        reference: reference || null,
        rfqDate: rfqDate ? new Date(rfqDate) : null,
        quoteSentDate: quoteSentDate ? new Date(quoteSentDate) : null,
        product: product || null,
        status: status ?? "RFQ_RECEIVED",
        waitingOn: waitingOn ?? "INTERNAL",
        description: description || null,
        createdById: session.user.id,
      },
    })
    await db.comment.create({
      data: {
        content: "Opportunity created",
        system: true,
        opportunityId: opportunity.id,
        authorId: session.user.id,
      },
    })
    await writeLog({
      type: "OPPORTUNITY_CREATED",
      message: `"${opportunity.title}" created`,
      userId: session.user.id,
      opportunityId: opportunity.id,
    })
    return NextResponse.json(opportunity, { status: 201 })
  } catch (err: unknown) {
    console.error("Create opportunity error:", err)
    const code = (err as { code?: string })?.code
    if (code === "P2003") {
      return NextResponse.json(
        { error: "Session expired — please sign out and sign back in." },
        { status: 401 }
      )
    }
    return NextResponse.json({ error: "Failed to save opportunity." }, { status: 500 })
  }
}
