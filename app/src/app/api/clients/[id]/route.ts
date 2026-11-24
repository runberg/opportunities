import { NextRequest, NextResponse } from "next/server"
import { requireAdmin } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { clientApiError, requireClientsWrite } from "@/modules/clients/api"
import { ClientConflict, clientTransaction, updateLinkedCustomer } from "@/modules/clients/data"
import { clientInput, deleteConfirmation } from "@/modules/clients/validation"

type Context = { params: Promise<{ id: string }> }

export async function PATCH(req: NextRequest, { params }: Context) {
  const { session, error } = await requireClientsWrite()
  if (error) return error
  const { id } = await params
  const parsed = clientInput.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid client details." }, { status: 400 })
  const input = parsed.data

  try {
    const client = await clientTransaction(async (tx) => {
      const previous = await tx.client.findUniqueOrThrow({ where: { id }, select: { codeName: true } })
      const updated = await tx.client.update({
        where: { id },
        data: { ...input, codeNameKey: input.codeName.toLowerCase() },
        select: { id: true, codeName: true },
      })
      if (previous.codeName !== updated.codeName) await updateLinkedCustomer(tx, id, updated.codeName)
      return updated
    })
    await writeLog({ type: "CLIENT_UPDATED", userId: session.user.id, message: `Client "${client.codeName}" updated` })
    return NextResponse.json(client)
  } catch (error) {
    return clientApiError(error)
  }
}

export async function DELETE(req: NextRequest, { params }: Context) {
  const { session, error } = await requireAdmin()
  if (error) return error
  const { id } = await params
  const confirmation = deleteConfirmation.safeParse(await req.json().catch(() => null))
  if (!confirmation.success) return NextResponse.json({ error: "Confirm the client deletion first." }, { status: 400 })
  const expected = confirmation.data

  try {
    await clientTransaction(async (tx) => {
      const current = await tx.client.findUniqueOrThrow({
        where: { id },
        select: { codeName: true, _count: { select: { opportunities: true, adhocPackages: true, communications: true } } },
      })
      const { opportunities, adhocPackages, communications } = current._count
      if (current.codeName !== expected.codeName || opportunities !== expected.opportunities ||
          adhocPackages !== expected.adhocPackages || communications !== expected.communications) {
        throw new ClientConflict("The client or its linked work changed. Refresh and review the deletion again.")
      }
      await updateLinkedCustomer(tx, id, current.codeName, true)
      await tx.client.delete({ where: { id } })
      await writeLog({
        type: "CLIENT_DELETED", userId: session.user.id,
        message: `Client "${current.codeName}" deleted. Unlinked ${opportunities} opportunities and ${adhocPackages} Ad Hoc packages. Removed ${communications} communications.`,
      }, tx)
    })
    return NextResponse.json({ ok: true })
  } catch (error) {
    return clientApiError(error)
  }
}
