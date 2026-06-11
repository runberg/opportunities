import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { z } from "zod"
import { requireSession } from "@/shared/lib/api"

const schema = z.object({
  emailNotifications: z.boolean(),
})

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  await db.user.update({
    where: { id: session.user.id },
    data: { emailNotifications: parsed.data.emailNotifications },
  })

  return NextResponse.json({ ok: true })
}
