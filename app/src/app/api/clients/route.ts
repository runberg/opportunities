import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { writeLog } from "@/shared/lib/system-log"
import { clientApiError, requireClientsWrite } from "@/modules/clients/api"
import { listClients } from "@/modules/clients/data"
import { clientInput } from "@/modules/clients/validation"

export async function GET() {
  const { session, error } = await requireClientsWrite()
  if (error) return error
  return NextResponse.json(await listClients(session))
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireClientsWrite()
  if (error) return error
  const parsed = clientInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid client details." }, { status: 400 })
  const input = parsed.data

  try {
    const client = await db.client.create({
      data: { ...input, codeNameKey: input.codeName.toLowerCase() },
      select: { id: true, codeName: true },
    })
    await writeLog({ type: "CLIENT_CREATED", userId: session.user.id, message: `Client "${client.codeName}" created` })
    return NextResponse.json(client, { status: 201 })
  } catch (error) {
    return clientApiError(error)
  }
}
