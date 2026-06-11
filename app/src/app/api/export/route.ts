import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { requireSession } from "@/lib/api"
import { formatDate, buildOpportunityWhere, STATUS_LABELS, QUOTE_STATUSES, EL_STATUSES, PRODUCTION_STATUSES } from "@/lib/utils"

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

export async function GET(req: NextRequest) {
  const { error } = await requireSession()
  if (error) return error

  const sp = req.nextUrl.searchParams
  const type = sp.get("type") ?? "quotes"
  const query = sp.get("q")?.trim() ?? ""
  const selectedStatuses = sp.get("status")?.split(",").filter(Boolean) ?? []
  let csv = ""
  let filename: string

  if (type === "quotes") {
    const where = buildOpportunityWhere(query, selectedStatuses, QUOTE_STATUSES)
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
    const where = buildOpportunityWhere(query, selectedStatuses, EL_STATUSES)
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
    const where = buildOpportunityWhere(query, selectedStatuses, PRODUCTION_STATUSES)
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
