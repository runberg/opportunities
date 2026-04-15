import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { z } from "zod"

const commentSchema = z.object({
  content: z.string().min(1).max(5000),
})

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { id: opportunityId } = await params
  const body = await req.json()
  const parsed = commentSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const opportunity = await db.opportunity.findUnique({ where: { id: opportunityId } })
  if (!opportunity) return NextResponse.json({ error: "Not found" }, { status: 404 })

  const comment = await db.comment.create({
    data: {
      content: parsed.data.content,
      authorId: session.user.id,
      opportunityId,
    },
    include: { author: { select: { id: true, name: true } } },
  })

  return NextResponse.json(comment, { status: 201 })
}
