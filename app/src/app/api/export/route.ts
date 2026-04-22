import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireSession } from "@/lib/api"
import { formatDate } from "@/lib/utils"

const QUOTE_STATUSES = ["RFQ_RECEIVED", "QUOTE_SENT"]
const EL_STATUSES = ["EL_REQUEST_RECEIVED", "EL_DRAFT_SHARED", "EL_SIGNED_SHARED", "EL_FULLY_SIGNED"]
const PRODUCTION_STATUSES = ["PENDING_ADVANCE_PAYMENT", "IN_PRODUCTION", "PRODUCTION", "DELIVERED"]

const STATUS_LABELS: Record<string, string> = {
  RFQ_RECEIVED: "RFQ Received",
  QUOTE_SENT: "Quote Sent",
  EL_REQUEST_RECEIVED: "EL Requested",
  EL_DRAFT_SHARED: "EL Draft Shared",
  EL_SIGNED_SHARED: "EL Signed Shared",
  EL_FULLY_SIGNED: "EL Fully Signed",
  PENDING_ADVANCE_PAYMENT: "Pending Advance Payment",
  IN_PRODUCTION: "In Production",
  PRODUCTION: "In Production",
  DELIVERED: "Delivered",
}

function cell(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v)
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function row(values: (string | number | null | undefined)[]): string {
  return values.map(cell).join(",")
}

function buildWhere(query: string, statuses: string[], pending: string[], defaultStatuses: string[]) {
  return {
    AND: [
      query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" as const } },
              { customer: { contains: query, mode: "insensitive" as const } },
              { reference: { contains: query, mode: "insensitive" as const } },
              { internalId: { contains: query, mode: "insensitive" as const } },
              { product: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {},
      { status: { in: (statuses.length > 0 ? statuses : defaultStatuses) as never[] } },
      pending.length > 0 ? { waitingOn: { in: pending as never[] } } : {},
    ],
  }
}

export async function GET(req: NextRequest) {
  const { error } = await requireSession()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const type = sp.get("type") ?? "quotes"
  const query = sp.get("q")?.trim() ?? ""
  const selectedStatuses = sp.get("status")?.split(",").filter(Boolean) ?? []
  let csv = ""
  let filename = "export.csv"

  if (type === "quotes") {
    const where = buildWhere(query, selectedStatuses, [], QUOTE_STATUSES)
    const records = await db.opportunity.findMany({ where, orderBy: { updatedAt: "desc" } })
    filename = "quotes.csv"
    const header = row(["ID", "Title", "Customer", "Reference", "Product", "Status", "RFQ Date", "Quote Sent Date", "Details"])
    const lines = records.map((r) =>
      row([r.internalId, r.title, r.customer, r.reference, r.product,
        STATUS_LABELS[r.status] ?? r.status,
        r.rfqDate ? formatDate(r.rfqDate) : null,
        r.quoteSentDate ? formatDate(r.quoteSentDate) : null,
        r.description])
    )
    csv = [header, ...lines].join("\r\n")
  } else if (type === "els") {
    const where = buildWhere(query, selectedStatuses, [], EL_STATUSES)
    const records = await db.opportunity.findMany({ where, orderBy: { updatedAt: "desc" } })
    filename = "engagement-letters.csv"
    const header = row(["ID", "Title", "Customer", "Reference", "Product", "Status", "EL Requested Date", "EL Draft Shared", "EL Signed Shared", "Details"])
    const lines = records.map((r) =>
      row([r.internalId, r.title, r.customer, r.reference, r.product,
        STATUS_LABELS[r.status] ?? r.status,
        r.elRequestedDate ? formatDate(r.elRequestedDate) : null,
        r.elDraftSharedDate ? formatDate(r.elDraftSharedDate) : null,
        r.elSignedSharedDate ? formatDate(r.elSignedSharedDate) : null,
        r.description])
    )
    csv = [header, ...lines].join("\r\n")
  } else if (type === "production") {
    const where = buildWhere(query, selectedStatuses, [], PRODUCTION_STATUSES)
    const records = await db.opportunity.findMany({ where, orderBy: { updatedAt: "desc" } })
    filename = "production.csv"
    const header = row(["ID", "Title", "Customer", "Reference", "Product", "Status", "Advance Payment Date", "FAT Date", "FAT Passed", "SAT Applicable", "SAT Date", "SAT Passed", "Delivered Date"])
    const lines = records.map((r) =>
      row([r.internalId, r.title, r.customer, r.reference, r.product,
        STATUS_LABELS[r.status] ?? r.status,
        r.advancePaymentDate ? formatDate(r.advancePaymentDate) : null,
        r.fatDate ? formatDate(r.fatDate) : null,
        r.fatPassedDate ? formatDate(r.fatPassedDate) : null,
        r.satApplicable ? "Yes" : "No",
        r.satDate ? formatDate(r.satDate) : null,
        r.satPassedDate ? formatDate(r.satPassedDate) : null,
        r.deliveredDate ? formatDate(r.deliveredDate) : null])
    )
    csv = [header, ...lines].join("\r\n")
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 })
  }

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  })
}
