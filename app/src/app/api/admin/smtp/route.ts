import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { z } from "zod"
import { requireAdmin } from "@/lib/api"

const schema = z.object({
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535),
  secure: z.boolean(),
  username: z.string().min(1),
  password: z.string().optional(),
  fromAddress: z.string().email(),
  fromName: z.string().min(1),
  enabled: z.boolean(),
  notificationSubject: z.string(),
  notificationBody: z.string(),
})

export async function GET() {
  const { error } = await requireAdmin()
  if (error) return error

  const config = await db.smtpConfig.findUnique({ where: { id: "default" } })
  if (!config) return NextResponse.json(null)

  const { password: _, ...safe } = config
  return NextResponse.json({ ...safe, hasPassword: true })
}

export async function POST(req: NextRequest) {
  const { error } = await requireAdmin()
  if (error) return error

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 })
  }

  const { password, ...rest } = parsed.data
  const existing = await db.smtpConfig.findUnique({ where: { id: "default" } })

  if (existing) {
    const data: Record<string, unknown> = { ...rest }
    if (password) data.password = password
    const config = await db.smtpConfig.update({ where: { id: "default" }, data })
    const { password: _, ...safe } = config
    return NextResponse.json({ ...safe, hasPassword: true })
  } else {
    if (!password) {
      return NextResponse.json({ error: "Password is required for initial setup." }, { status: 400 })
    }
    const config = await db.smtpConfig.create({
      data: { id: "default", ...rest, password },
    })
    const { password: __, ...safe } = config
    return NextResponse.json({ ...safe, hasPassword: true })
  }
}
