import { NextRequest, NextResponse } from "next/server"
import { db } from "@/shared/lib/db"
import { clientApiError, requireClientsWrite } from "@/modules/clients/api"
import { communicationInput } from "@/modules/clients/validation"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireClientsWrite()
  if (error) return error
  const { id } = await params
  const parsed = communicationInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Enter a date, channel, recipient, and summary." }, { status: 400 })
  try {
    await db.clientCommunication.create({
      data: { ...parsed.data, clientId: id, authorId: session.user.id },
      select: { id: true },
    })
    return NextResponse.json({ ok: true }, { status: 201 })
  } catch (error) {
    return clientApiError(error)
  }
}
