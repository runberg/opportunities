import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { requireAdmin } from "@/lib/api"
import { writeLog } from "@/lib/system-log"

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "USER"]).optional(),
})

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const exists = await db.user.findUnique({ where: { email: parsed.data.email } })
  if (exists) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 })
  }

  const hashed = await bcrypt.hash(parsed.data.password, 12)
  const user = await db.user.create({
    data: {
      name: parsed.data.email, // username is always the email address
      email: parsed.data.email,
      password: hashed,
      role: parsed.data.role ?? "USER",
    },
    select: { id: true, email: true, role: true, active: true, createdAt: true },
  })

  await writeLog({
    type: "USER_CREATED",
    message: `User "${user.email}" created`,
    userId: session.user.id,
  })

  return NextResponse.json(user, { status: 201 })
}
