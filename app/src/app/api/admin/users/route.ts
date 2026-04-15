import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"

const createSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(["ADMIN", "USER"]).optional(),
})

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

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
      name: parsed.data.name,
      email: parsed.data.email,
      password: hashed,
      role: parsed.data.role ?? "USER",
    },
    select: { id: true, name: true, email: true, role: true, active: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
