import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const createSchema = z.object({
  internalId: z.string().optional(),
  title: z.string().min(1),
  customer: z.string().min(1),
  reference: z.string().optional(),
  rfqDate: z.string().optional(),
  product: z.string().optional(),
  status: z.string().optional(),
  waitingOn: z.string().optional(),
  description: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const { internalId, title, customer, reference, rfqDate, product, status, waitingOn, description } =
    parsed.data

  try {
    const opportunity = await db.opportunity.create({
      data: {
        internalId: internalId || null,
        title,
        customer,
        reference: reference || null,
        rfqDate: rfqDate ? new Date(rfqDate) : null,
        product: product || null,
        status: (status as never) ?? "RFQ_RECEIVED",
        waitingOn: (waitingOn as never) ?? "INTERNAL",
        description: description || null,
        createdById: session.user.id,
      },
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
