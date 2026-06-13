import { NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { requireSession } from "@/shared/lib/api"

export async function GET() {
  const result = await requireSession()
  if (result.error) return result.error
  if (result.session.user.role !== "ADMIN")
    return NextResponse.json({ error: "Admin only" }, { status: 403 })

  const deliverables = await db.adhocDeliverable.findMany({
    orderBy: [{ agreement: { title: "asc" } }, { createdAt: "asc" }],
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
      agreement: { select: { id: true, title: true } },
    },
  })

  return NextResponse.json(deliverables)
}
