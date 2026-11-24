import { NextRequest, NextResponse } from "next/server"
import { hasSectionAccess } from "@/shared/lib/api"
import { writeLog } from "@/shared/lib/system-log"
import { clientApiError, requireClientsWrite } from "@/modules/clients/api"
import { ClientConflict, clientTransaction, findWork, searchWork } from "@/modules/clients/data"
import { workChange, workSearch } from "@/modules/clients/validation"

export async function GET(req: NextRequest) {
  const { session, error } = await requireClientsWrite()
  if (error) return error
  const parsed = workSearch.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: "Invalid search." }, { status: 400 })
  const { kind, q, workId } = parsed.data
  if (!hasSectionAccess(session, kind, "FULL")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  return NextResponse.json(await searchWork(kind, q, session.user.role === "ADMIN", workId))
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { session, error } = await requireClientsWrite()
  if (error) return error
  const { id } = await params
  const parsed = workChange.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Invalid link change." }, { status: 400 })
  const { kind, workId, expectedClientId, action } = parsed.data
  if (!hasSectionAccess(session, kind, "FULL")) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  try {
    const result = await clientTransaction(async (tx) => {
      const client = await tx.client.findUniqueOrThrow({ where: { id }, select: { codeName: true } })
      const work = await findWork(tx, kind, workId)
      if (!work) return null
      if (work.isArchived) throw new ClientConflict("Unarchive the work item before changing its client.")
      if (work.status === "CLOSED_FINANCE" && session.user.role !== "ADMIN") {
        throw new ClientConflict("Only admins can change the client on a closed finance package.")
      }
      if (work.clientId !== expectedClientId || (action === "unlink" && work.clientId !== id)) {
        throw new ClientConflict("The work item’s client changed. Refresh and try again.")
      }
      const clientId = action === "link" ? id : null
      if (clientId === work.clientId) return { changed: false, codeName: client.codeName }
      const data = { clientId, customer: client.codeName }
      if (kind === "opportunities") await tx.opportunity.update({ where: { id: workId }, data })
      else await tx.adhocDeliverable.update({ where: { id: workId }, data })
      return { changed: true, codeName: client.codeName }
    })
    if (!result) return NextResponse.json({ error: "Work item not found." }, { status: 404 })
    if (result.changed) {
      await writeLog({
        type: "CLIENT_UPDATED", userId: session.user.id,
        message: `${action === "link" ? "Linked work to" : "Unlinked work from"} client "${result.codeName}"`,
        ...(kind === "opportunities" ? { opportunityId: workId } : { adhocDeliverableId: workId }),
      })
    }
    return NextResponse.json({ ok: true })
  } catch (error) {
    return clientApiError(error)
  }
}
