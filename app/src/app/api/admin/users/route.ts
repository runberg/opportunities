import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { requireAdmin, ACCESS_LEVELS } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { enqueueEmails } from "@/shared/lib/email-outbox"
import { buildWelcomeEmail } from "@/modules/admin/welcome-email"

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
  sendWelcomeEmail: z.boolean().default(false),
  role: z.enum(["ADMIN", "USER"]).optional(),
  opportunitiesAccess: z.enum(ACCESS_LEVELS).optional(),
  adhocAccess: z.enum(ACCESS_LEVELS).optional(),
  inventoryAccess: z.enum(ACCESS_LEVELS).optional(),
}).refine((data) => data.sendWelcomeEmail || (data.password?.length ?? 0) >= 8)

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const opportunitiesAccess = parsed.data.opportunitiesAccess ?? "FULL"
  const adhocAccess = parsed.data.adhocAccess ?? "FULL"
  const inventoryAccess = parsed.data.inventoryAccess ?? "FULL"
  if (opportunitiesAccess === "NONE" && adhocAccess === "NONE" && inventoryAccess === "NONE") {
    return NextResponse.json(
      { error: "A user must have access to at least one section." },
      { status: 400 }
    )
  }

  const exists = await db.user.findUnique({ where: { email: parsed.data.email } })
  if (exists) {
    return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 })
  }

  if (parsed.data.sendWelcomeEmail) {
    const smtp = await db.smtpConfig.findUnique({ where: { id: "default" } })
    if (!smtp?.enabled || !process.env.NEXTAUTH_URL) {
      return NextResponse.json({ error: "Enable SMTP and configure NEXTAUTH_URL before sending welcome emails." }, { status: 400 })
    }
  }

  const hashed = await bcrypt.hash(parsed.data.sendWelcomeEmail ? "change_me" : parsed.data.password!, 12)
  const user = await db.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name: parsed.data.email,
        email: parsed.data.email,
        password: hashed,
        role: parsed.data.role ?? "USER",
        opportunitiesAccess,
        adhocAccess,
        inventoryAccess,
      },
      select: { id: true, email: true, role: true, active: true, createdAt: true, opportunitiesAccess: true, adhocAccess: true, inventoryAccess: true },
    })
    if (parsed.data.sendWelcomeEmail) {
      await enqueueEmails([buildWelcomeEmail(created.email, process.env.NEXTAUTH_URL!)], tx)
    }
    return created
  })

  await writeLog({
    type: "USER_CREATED",
    message: `User "${user.email}" created`,
    userId: session.user.id,
  })

  return NextResponse.json(user, { status: 201 })
}
