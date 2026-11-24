import { hasSectionAccess } from "@/shared/lib/api"
import { requireSectionAccess } from "@/shared/lib/page-access"
import { listClients } from "@/modules/clients/data"
import { ClientsList } from "@/modules/clients/components/clients-list"
import { workSearch } from "@/modules/clients/validation"

export default async function ClientsPage({ searchParams }: { readonly searchParams: Promise<{ kind?: string; workId?: string }> }) {
  const { session, isReadOnly } = await requireSectionAccess("clients")
  const [clients, params] = await Promise.all([listClients(session), searchParams])
  const parsed = workSearch.safeParse(params)
  const preset = !isReadOnly && parsed.success && parsed.data.workId && hasSectionAccess(session, parsed.data.kind, "FULL")
    ? { kind: parsed.data.kind, workId: parsed.data.workId }
    : undefined
  return <ClientsList clients={clients} canWrite={!isReadOnly} preset={preset} />
}
