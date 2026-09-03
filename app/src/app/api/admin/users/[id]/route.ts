import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import bcrypt from "bcryptjs"
import { z } from "zod"
import { requireAdmin, ACCESS_LEVELS } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  active: z.boolean().optional(),
  newPassword: z.string().min(8).optional().or(z.literal("")),
  opportunitiesAccess: z.enum(ACCESS_LEVELS).optional(),
  adhocAccess: z.enum(ACCESS_LEVELS).optional(),
  inventoryAccess: z.enum(ACCESS_LEVELS).optional(),
})

type AccessFields = {
  opportunitiesAccess?: string
  adhocAccess?: string
  inventoryAccess?: string
}

async function buildUserData(
  rest: { name?: string; email?: string; role?: string; active?: boolean },
  newPassword: string | undefined,
  access: AccessFields,
): Promise<Record<string, unknown>> {
  const data: Record<string, unknown> = { ...rest, ...access }
  if (rest.email) data.name = rest.email
  if (newPassword) data.password = await bcrypt.hash(newPassword, 12)
  return data
}

function buildUserChanges(
  rest: { name?: string; email?: string; role?: string; active?: boolean },
  newPassword: string | undefined,
  access: AccessFields,
): string[] {
  const changes: string[] = []
  if (rest.name) changes.push(`name set to "${rest.name}"`)
  if (rest.email) changes.push(`email set to "${rest.email}"`)
  if (rest.role) changes.push(`role set to ${rest.role}`)
  if (rest.active !== undefined) changes.push(rest.active ? "account activated" : "account deactivated")
  if (newPassword) changes.push("password reset")
  if (access.opportunitiesAccess) changes.push(`opportunities access → ${access.opportunitiesAccess}`)
  if (access.adhocAccess) changes.push(`ad hoc access → ${access.adhocAccess}`)
  if (access.inventoryAccess) changes.push(`inventory access → ${access.inventoryAccess}`)
  return changes
}

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

  const { newPassword, opportunitiesAccess, adhocAccess, inventoryAccess, ...rest } = parsed.data
  const access: AccessFields = { opportunitiesAccess, adhocAccess, inventoryAccess }

  if (opportunitiesAccess !== undefined || adhocAccess !== undefined || inventoryAccess !== undefined) {
    const current = await db.user.findUnique({
      where: { id },
      select: { opportunitiesAccess: true, adhocAccess: true, inventoryAccess: true },
    })
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 })
    const resolvedOpps = opportunitiesAccess ?? current.opportunitiesAccess
    const resolvedAdhoc = adhocAccess ?? current.adhocAccess
    const resolvedInventory = inventoryAccess ?? current.inventoryAccess
    if (resolvedOpps === "NONE" && resolvedAdhoc === "NONE" && resolvedInventory === "NONE") {
      return NextResponse.json(
        { error: "A user must have access to at least one section." },
        { status: 400 }
      )
    }
  }

  // Check email uniqueness if changed
  if (rest.email) {
    const existing = await db.user.findFirst({
      where: { email: rest.email, NOT: { id } },
    })
    if (existing) {
      return NextResponse.json({ error: "Email already in use." }, { status: 409 })
    }
  }

  const data = await buildUserData(rest, newPassword || undefined, access)

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, email: true, role: true, active: true, createdAt: true, opportunitiesAccess: true, adhocAccess: true, inventoryAccess: true },
  })

  const changes = buildUserChanges(rest, newPassword || undefined, access)

  await writeLog({
    type: "USER_UPDATED",
    message: `User "${user.email}" updated` + (changes.length ? `: ${changes.join(", ")}` : ""),
    userId: session.user.id,
  })

  return NextResponse.json(user)
}
