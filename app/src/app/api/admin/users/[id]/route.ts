import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { requireAdmin } from "@/lib/api"
import { writeLog } from "@/lib/system-log"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  active: z.boolean().optional(),
  newPassword: z.string().min(8).optional().or(z.literal("")),
})

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const { id } = await params
  const body = await req.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const { newPassword, ...rest } = parsed.data

  // Check email uniqueness if changed
  if (rest.email) {
    const existing = await db.user.findFirst({
      where: { email: rest.email, NOT: { id } },
    })
    if (existing) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 })
    }
  }

  const data: Record<string, unknown> = { ...rest }
  if (rest.email) data.name = rest.email // keep name in sync with email
  if (newPassword) data.password = await bcrypt.hash(newPassword, 12)

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, email: true, role: true, active: true, createdAt: true },
  })

  const changes: string[] = []
  if (rest.name) changes.push(`name set to "${rest.name}"`)
  if (rest.email) changes.push(`email set to "${rest.email}"`)
  if (rest.role) changes.push(`role set to ${rest.role}`)
  if (rest.active !== undefined) changes.push(rest.active ? "account activated" : "account deactivated")
  if (newPassword) changes.push("password reset")

  await writeLog({
    type: "USER_UPDATED",
    message: `User "${user.email}" updated` + (changes.length ? `: ${changes.join(", ")}` : ""),
    userId: session.user.id,
  })

  return NextResponse.json(user)
}
