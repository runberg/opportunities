import { notFound } from "next/navigation"
import { hasSectionAccess } from "@/shared/lib/api"
import { requireSectionAccess } from "@/shared/lib/page-access"
import { getClient } from "@/modules/clients/data"
import { ClientDetail, type LinkedWork } from "@/modules/clients/components/client-detail"
import { workSearch } from "@/modules/clients/validation"

export default async function ClientPage({
  params, searchParams,
}: {
  readonly params: Promise<{ id: string }>
  readonly searchParams: Promise<{ kind?: string; workId?: string; opportunity?: string; package?: string }>
}) {
  const { session, isReadOnly, isAdmin } = await requireSectionAccess("clients")
  const [{ id }, query] = await Promise.all([params, searchParams])
  const client = await getClient(session, id)
  if (!client) notFound()
  const workAccess = {
    opportunities: hasSectionAccess(session, "opportunities", "FULL"),
    adhoc: hasSectionAccess(session, "adhoc", "FULL"),
  }
  const writableKinds = (["opportunities", "adhoc"] as const).filter(
    (kind) => !isReadOnly && workAccess[kind],
  )
  const parsed = workSearch.safeParse(query)
  const preset = parsed.success && parsed.data.workId && writableKinds.includes(parsed.data.kind)
    ? { kind: parsed.data.kind, workId: parsed.data.workId }
    : undefined
  const linkedWork: LinkedWork[] = [
    ...client.opportunities.map((item): LinkedWork => ({
      id: item.id, kind: "opportunities", title: item.title, internalId: item.internalId,
      href: `/clients/${id}?opportunity=${item.id}`,
      archived: item.isArchived,
      canUnlink: writableKinds.includes("opportunities") && !item.isArchived,
    })),
    ...client.adhoc.map((item): LinkedWork => ({
      id: item.id, kind: "adhoc", title: item.title, internalId: item.internalId,
      href: `/clients/${id}?package=${item.id}`,
      archived: item.isArchived,
      canUnlink: writableKinds.includes("adhoc") && !item.isArchived && (isAdmin || item.status !== "CLOSED_FINANCE"),
    })),
  ]
  const openWork = linkedWork.find((item) => item.id === (item.kind === "opportunities" ? query.opportunity : query.package))
  const workBySource = new Map(linkedWork.map((item) => [`${item.kind}:${item.id}`, item]))
  const workComments = [
    ...client.opportunities.map((item) => ({ ...item, kind: "opportunities" })),
    ...client.adhoc.map((item) => ({ ...item, kind: "adhoc" })),
  ].flatMap((item) => {
    const source = workBySource.get(`${item.kind}:${item.id}`)
    if (!source) return []
    const kind = source.kind === "opportunities" ? "Opportunity" : "Ad Hoc package"
    return item.comments.map((comment) => ({
      id: comment.id,
      content: comment.content,
      date: comment.createdAt.toISOString(),
      authorName: comment.author?.name ?? null,
      source: { label: `${kind} · ${source.internalId ?? source.title}`, href: source.href },
    }))
  })
  return <ClientDetail client={{
    id: client.id, codeName: client.codeName, name: client.name, description: client.description,
    communications: client.communications.map((entry) => ({ ...entry, communicatedAt: entry.communicatedAt.toISOString() })),
  }} workComments={workComments} work={linkedWork} writableKinds={writableKinds} isAdmin={isAdmin} canWrite={!isReadOnly} preset={preset} openWork={openWork} workAccess={workAccess} />
}
