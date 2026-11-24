import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { z } from "zod"
import { requireAdmin, ACCESS_LEVELS } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["ADMIN", "USER"]).optional(),
  active: z.boolean().optional(),
  opportunitiesAccess: z.enum(ACCESS_LEVELS).optional(),
  adhocAccess: z.enum(ACCESS_LEVELS).optional(),
  inventoryAccess: z.enum(ACCESS_LEVELS).optional(),
  clientsAccess: z.enum(ACCESS_LEVELS).optional(),
})

type AccessFields = {
  opportunitiesAccess?: string
  adhocAccess?: string
  inventoryAccess?: string
  clientsAccess?: string
}

function buildUserData(
  rest: { name?: string; email?: string; role?: string; active?: boolean },
  access: AccessFields,
): Record<string, unknown> {
  const data: Record<string, unknown> = { ...rest, ...access }
  if (rest.email) data.name = rest.email
  return data
}

function buildUserChanges(
  rest: { name?: string; email?: string; role?: string; active?: boolean },
  access: AccessFields,
): string[] {
  const changes: string[] = []
  if (rest.name) changes.push(`name set to "${rest.name}"`)
  if (rest.email) changes.push(`email set to "${rest.email}"`)
  if (rest.role) changes.push(`role set to ${rest.role}`)
  if (rest.active !== undefined) changes.push(rest.active ? "account activated" : "account deactivated")
  if (access.opportunitiesAccess) changes.push(`opportunities access → ${access.opportunitiesAccess}`)
  if (access.adhocAccess) changes.push(`ad hoc access → ${access.adhocAccess}`)
  if (access.inventoryAccess) changes.push(`inventory access → ${access.inventoryAccess}`)
  if (access.clientsAccess) changes.push(`clients access → ${access.clientsAccess}`)
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

  const { opportunitiesAccess, adhocAccess, inventoryAccess, clientsAccess, ...rest } = parsed.data
  const access: AccessFields = { opportunitiesAccess, adhocAccess, inventoryAccess, clientsAccess }

  if (opportunitiesAccess !== undefined || adhocAccess !== undefined || inventoryAccess !== undefined || clientsAccess !== undefined || rest.role !== undefined) {
    const current = await db.user.findUnique({
      where: { id },
      select: { opportunitiesAccess: true, adhocAccess: true, inventoryAccess: true, clientsAccess: true, role: true },
    })
    if (!current) return NextResponse.json({ error: "User not found" }, { status: 404 })
    const resolvedOpps = opportunitiesAccess ?? current.opportunitiesAccess
    const resolvedAdhoc = adhocAccess ?? current.adhocAccess
    const resolvedInventory = inventoryAccess ?? current.inventoryAccess
    const resolvedClients = clientsAccess ?? current.clientsAccess
    if ((rest.role ?? current.role) !== "ADMIN" && [resolvedOpps, resolvedAdhoc, resolvedInventory, resolvedClients].every((level) => level === "NONE")) {
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

  const data = buildUserData(rest, access)

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, email: true, role: true, active: true, createdAt: true, opportunitiesAccess: true, adhocAccess: true, inventoryAccess: true, clientsAccess: true },
  })

  const changes = buildUserChanges(rest, access)

  await writeLog({
    type: "USER_UPDATED",
    message: `User "${user.email}" updated` + (changes.length ? `: ${changes.join(", ")}` : ""),
    userId: session.user.id,
  })

  return NextResponse.json(user)
}
