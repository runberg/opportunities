import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { z } from "zod"
import { requireSession } from "@/shared/lib/api"

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  emailNotifications: z.boolean().optional(),
})

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const data: { name?: string; emailNotifications?: boolean } = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.emailNotifications !== undefined) data.emailNotifications = parsed.data.emailNotifications

  await db.user.update({ where: { id: session.user.id }, data })

  return NextResponse.json({ ok: true })
}
