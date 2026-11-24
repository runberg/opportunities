import { Prisma } from "@prisma/client"
import type { Session } from "next-auth"
import { db } from "@/shared/lib/db"
import { hasSectionAccess } from "@/shared/lib/api"
import type { WorkKind } from "./validation"

const clientPublic = { id: true, codeName: true } as const

export function listClients(session: Session) {
  const canWrite = hasSectionAccess(session, "clients", "FULL")
  return db.client.findMany({
    select: { ...clientPublic, name: canWrite },
    orderBy: { codeNameKey: "asc" },
  })
}

const workSelect = { id: true, internalId: true, title: true, customer: true, status: true, isArchived: true, clientId: true } as const

export async function getClient(session: Session, id: string) {
  const canWrite = hasSectionAccess(session, "clients", "FULL")
  const client = await db.client.findUnique({
    where: { id },
    select: { ...clientPublic, name: canWrite, description: canWrite },
  })
  if (!client) return null

  const [opportunities, adhoc, communications] = await Promise.all([
    hasSectionAccess(session, "opportunities", "READ_ONLY")
      ? db.opportunity.findMany({ where: { clientId: id }, select: workSelect, orderBy: { title: "asc" } }) : [],
    hasSectionAccess(session, "adhoc", "READ_ONLY")
      ? db.adhocDeliverable.findMany({
        where: { clientId: id }, select: { ...workSelect, agreementId: true }, orderBy: { title: "asc" },
      }) : [],
    canWrite ? db.clientCommunication.findMany({
      where: { clientId: id },
      select: {
        id: true, communicatedAt: true, channel: true, recipient: true, summary: true,
        author: { select: { name: true } },
      },
      orderBy: [{ communicatedAt: "desc" }, { createdAt: "desc" }],
    }) : [],
  ])
  return { ...client, opportunities, adhoc, communications }
}

export function searchWork(kind: WorkKind, q: string, isAdmin: boolean, workId?: string) {
  const match = q ? { contains: q, mode: "insensitive" as const } : undefined
  const where = {
    isArchived: false,
    id: workId,
    ...(match && { OR: [{ title: match }, { internalId: match }] }),
  }
  const options = { select: workSelect, take: 30, orderBy: { title: "asc" as const } }
  if (kind === "opportunities") return db.opportunity.findMany({ ...options, where })
  return db.adhocDeliverable.findMany({
    ...options,
    where: { ...where, ...(!isAdmin && { status: { not: "CLOSED_FINANCE" } }) },
  })
}

export class ClientConflict extends Error {}

export async function clientTransaction<T>(action: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await db.$transaction(action, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2034") throw error
    }
  }
  throw new ClientConflict("The client or linked work changed. Refresh and try again.")
}

export async function updateLinkedCustomer(tx: Prisma.TransactionClient, clientId: string, codeName: string, unlink = false) {
  const data = { customer: codeName, ...(unlink && { clientId: null }) }
  // Keep Customer as the public label consumed by both work modules and their export/search paths.
  await tx.opportunity.updateMany({ where: { clientId }, data })
  await tx.adhocDeliverable.updateMany({ where: { clientId }, data })
}

export async function findWork(tx: Prisma.TransactionClient, kind: WorkKind, id: string) {
  const options = { where: { id }, select: workSelect }
  return kind === "opportunities" ? tx.opportunity.findUnique(options) : tx.adhocDeliverable.findUnique(options)
}
