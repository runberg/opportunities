import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { requireSession } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession()
  if (error) return error

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password)
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 })
  }

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12)
  await db.user.update({
    where: { id: session.user.id },
    data: { password: hashed },
  })

  await writeLog({ type: "PASSWORD_CHANGED", message: "Password changed", userId: session.user.id })

  return NextResponse.json({ ok: true })
}
