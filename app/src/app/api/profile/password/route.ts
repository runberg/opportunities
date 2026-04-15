import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

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

  return NextResponse.json({ ok: true })
}
