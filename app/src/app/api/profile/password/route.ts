import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { requireSession } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"

const schema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).refine(
    (password) => Buffer.byteLength(password, "utf8") <= 72 && password !== "change_me",
    "Use a different password of at most 72 bytes.",
  ),
})

export async function POST(req: NextRequest) {
  const { session, error } = await requireSession({ allowPasswordSetup: true })
  if (error) return error

  const body = await req.json().catch(() => null)
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid input" }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { id: session.user.id } })
  if (!user?.active || user.credentialVersion !== session.user.credentialVersion) {
    return NextResponse.json({ error: "Sign in again to change your password." }, { status: 401 })
  }

  const valid = await bcrypt.compare(parsed.data.currentPassword, user.password)
  if (!valid) {
    return NextResponse.json({ error: "Current password is incorrect." }, { status: 400 })
  }

  if (await bcrypt.compare(parsed.data.newPassword, user.password)) {
    return NextResponse.json({ error: "Choose a different password." }, { status: 400 })
  }

  const hashed = await bcrypt.hash(parsed.data.newPassword, 12)
  const now = new Date()
  const updated = await db.user.updateMany({
    where: {
      id: user.id,
      active: true,
      password: user.password,
      credentialVersion: session.user.credentialVersion,
      OR: [{ temporaryPasswordExpiresAt: null }, { temporaryPasswordExpiresAt: { gt: now } }],
    },
    data: {
      password: hashed,
      passwordChangedAt: now,
      temporaryPasswordExpiresAt: null,
      ...(session.user.mustChangePassword && { credentialVersion: { increment: 1 } }),
    },
  })
  if (!updated.count) {
    return NextResponse.json({ error: "Your credentials changed or expired. Sign in again." }, { status: 409 })
  }

  await writeLog({ type: "PASSWORD_CHANGED", message: "Password changed", userId: session.user.id })

  return NextResponse.json({ ok: true })
}
