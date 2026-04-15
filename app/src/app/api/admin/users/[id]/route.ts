import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

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
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

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
  if (newPassword) {
    data.password = await bcrypt.hash(newPassword, 12)
  }

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  })

  return NextResponse.json(user)
}
