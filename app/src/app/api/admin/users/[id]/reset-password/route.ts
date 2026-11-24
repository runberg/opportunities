import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { db } from "@/shared/lib/db"
import { requireAdmin } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { enqueueCredentialEmail } from "@/modules/admin/welcome-email"
import { credentialDelivery, prepareTemporaryPassword } from "@/modules/admin/temporary-password"

const schema = z.object({ delivery: credentialDelivery })

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  if (id === session.user.id) {
    return NextResponse.json({ error: "Use Profile to change your own password." }, { status: 400 })
  }
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  const { delivery } = parsed.data
  const credential = await prepareTemporaryPassword(delivery)
  if (!credential) {
    return NextResponse.json({ error: "Reset email is unavailable. Check Email / SMTP settings or reset the password manually." }, { status: 409 })
  }

  const user = await db.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id, ...(process.env.ADMIN_EMAIL && { email: { not: process.env.ADMIN_EMAIL } }) },
      data: { ...credential.userData, credentialVersion: { increment: 1 } },
    })
    if (!updated.count) return null
    const account = await tx.user.findUniqueOrThrow({
      where: { id },
      select: { id: true, email: true, credentialVersion: true },
    })
    await tx.emailOutbox.deleteMany({
      where: { itemId: id, credentialVersion: { not: null }, status: { in: ["PENDING", "FAILED"] } },
    })
    if (credential.mail) {
      const { config, appUrl, secret } = credential.mail
      await enqueueCredentialEmail(tx, account, credential.password, config, appUrl, secret, "reset")
    }
    return account
  })

  if (!user) {
    const account = await db.user.findUnique({ where: { id }, select: { email: true } })
    if (account && account.email === process.env.ADMIN_EMAIL) {
      return NextResponse.json({ error: "The recovery administrator password is managed through deployment settings." }, { status: 409 })
    }
    return NextResponse.json({ error: "User not found." }, { status: 404 })
  }
  await writeLog({ type: "USER_UPDATED", message: `Password reset for "${user.email}"`, userId: session.user.id })
  return NextResponse.json({
    ...(delivery === "manual" && { temporaryPassword: credential.password }),
  }, { headers: { "Cache-Control": "no-store" } })
}
