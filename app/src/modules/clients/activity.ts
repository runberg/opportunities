import type { Session } from "next-auth"
import { db } from "@/shared/lib/db"
import { hasSectionAccess } from "@/shared/lib/api"
import type { LogEntry } from "@/shared/components/ui/log-section"

export function listClientCommunications(clientId: string) {
  return db.clientCommunication.findMany({
    where: { clientId },
    select: {
      id: true, communicatedAt: true, channel: true, recipient: true, summary: true,
      author: { select: { id: true, name: true } },
    },
    orderBy: [{ communicatedAt: "desc" }, { createdAt: "desc" }],
  })
}

export async function getLinkedClientActivity(
  session: Session,
  work: { clientId: string | null; customer: string | null },
): Promise<LogEntry[]> {
  if (!work.clientId || !hasSectionAccess(session, "clients", "FULL")) return []
  const clientId = work.clientId
  const communications = await listClientCommunications(clientId)
  return communications.map((entry) => ({
    id: `client-communication-${entry.id}`,
    content: entry.summary,
    createdAt: entry.communicatedAt,
    author: entry.author,
    system: false,
    source: { label: `Client communication · ${work.customer ?? "Client"}`, href: `/clients/${clientId}#communications` },
    context: `${entry.channel} · ${entry.recipient}`,
  }))
}
