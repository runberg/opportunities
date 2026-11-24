import { notFound } from "next/navigation"
import { hasSectionAccess } from "@/shared/lib/api"
import { requireSectionAccess } from "@/shared/lib/page-access"
import { opportunityBasePath } from "@/shared/lib/utils"
import { getClient } from "@/modules/clients/data"
import { ClientDetail, type LinkedWork } from "@/modules/clients/components/client-detail"
import { workSearch } from "@/modules/clients/validation"

export default async function ClientPage({
  params, searchParams,
}: {
  readonly params: Promise<{ id: string }>
  readonly searchParams: Promise<{ kind?: string; workId?: string }>
}) {
  const { session, isReadOnly, isAdmin } = await requireSectionAccess("clients")
  const [{ id }, query] = await Promise.all([params, searchParams])
  const client = await getClient(session, id)
  if (!client) notFound()
  const writableKinds = (["opportunities", "adhoc"] as const).filter(
    (kind) => !isReadOnly && hasSectionAccess(session, kind, "FULL"),
  )
  const parsed = workSearch.safeParse(query)
  const preset = parsed.success && parsed.data.workId && writableKinds.includes(parsed.data.kind)
    ? { kind: parsed.data.kind, workId: parsed.data.workId }
    : undefined
  const linkedWork: LinkedWork[] = [
    ...client.opportunities.map((item): LinkedWork => ({
      id: item.id, kind: "opportunities", title: item.title, internalId: item.internalId,
      href: `${opportunityBasePath(item.status)}?open=${item.id}`,
      archived: item.isArchived,
      canUnlink: writableKinds.includes("opportunities") && !item.isArchived,
    })),
    ...client.adhoc.map((item): LinkedWork => ({
      id: item.id, kind: "adhoc", title: item.title, internalId: item.internalId,
      href: `/adhoc?agreement=${item.agreementId}&deliverable=${item.id}`,
      archived: item.isArchived,
      canUnlink: writableKinds.includes("adhoc") && !item.isArchived && (isAdmin || item.status !== "CLOSED_FINANCE"),
    })),
  ]
  return <ClientDetail client={{
    id: client.id, codeName: client.codeName, name: client.name, description: client.description,
    communications: client.communications.map((entry) => ({ ...entry, communicatedAt: entry.communicatedAt.toISOString() })),
  }} work={linkedWork} writableKinds={writableKinds} isAdmin={isAdmin} canWrite={!isReadOnly} preset={preset} />
}
