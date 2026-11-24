import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { db } from "@/shared/lib/db"
import { z } from "zod"
import { requireAdmin, ACCESS_LEVELS } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { enqueueCredentialEmail } from "@/modules/admin/welcome-email"
import { credentialDelivery, prepareTemporaryPassword } from "@/modules/admin/temporary-password"

const createSchema = z.object({
  email: z.string().trim().email(),
  delivery: credentialDelivery,
  role: z.enum(["ADMIN", "USER"]).default("USER"),
  opportunitiesAccess: z.enum(ACCESS_LEVELS).default("FULL"),
  adhocAccess: z.enum(ACCESS_LEVELS).default("FULL"),
  inventoryAccess: z.enum(ACCESS_LEVELS).default("FULL"),
  clientsAccess: z.enum(ACCESS_LEVELS).default("NONE"),
})

export async function POST(req: NextRequest) {
  const { session, error } = await requireAdmin()
  if (error) return error

  const parsed = createSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 })

  const { delivery, ...account } = parsed.data
  if (account.role !== "ADMIN" && [account.opportunitiesAccess, account.adhocAccess, account.inventoryAccess, account.clientsAccess].every((level) => level === "NONE")) {
    return NextResponse.json({ error: "A user must have access to at least one section." }, { status: 400 })
  }

  const credential = await prepareTemporaryPassword(delivery)
  if (!credential) {
    return NextResponse.json({ error: "Welcome email is unavailable. Check Email / SMTP settings or create the user manually." }, { status: 409 })
  }

  try {
    const user = await db.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: { ...account, name: account.email, ...credential.userData },
        select: { id: true, email: true, credentialVersion: true },
      })
      if (credential.mail) {
        const { config, appUrl, secret } = credential.mail
        await enqueueCredentialEmail(tx, created, credential.password, config, appUrl, secret, "welcome")
      }
      return created
    })

    await writeLog({ type: "USER_CREATED", message: `User "${user.email}" created`, userId: session.user.id })
    return NextResponse.json({
      id: user.id,
      ...(delivery === "manual" && { temporaryPassword: credential.password }),
    }, { status: 201, headers: { "Cache-Control": "no-store" } })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json({ error: "A user with this email already exists." }, { status: 409 })
    }
    throw err
  }
}
