import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { z } from "zod"
import { requireSession } from "@/shared/lib/api"

const NOTIFICATION_LEVELS = ["NONE", "STATUS_CHANGES", "ALL"] as const

const schema = z.object({
  name: z.string().min(1).max(100).optional(),
  opportunityNotifications: z.enum(NOTIFICATION_LEVELS).optional(),
  adhocNotifications: z.enum(NOTIFICATION_LEVELS).optional(),
})

export async function PATCH(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (parsed.data.name !== undefined) data.name = parsed.data.name
  if (parsed.data.opportunityNotifications !== undefined) data.opportunityNotifications = parsed.data.opportunityNotifications
  if (parsed.data.adhocNotifications !== undefined) data.adhocNotifications = parsed.data.adhocNotifications

  await db.user.update({ where: { id: session.user.id }, data })

  return NextResponse.json({ ok: true })
}
