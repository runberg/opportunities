"use client"

import { Panel } from "@/shared/components/ui/panel"
import { PageHeader } from "@/shared/components/layout/page-header"
import { useState } from "react"
import { useSearchParams } from "next/navigation"
import type { ClientIdentity } from "@/shared/components/clients/client-name"
import type { AdhocAgreementStatus } from "@prisma/client"
import { AgreementTabs } from "./agreement-tabs"
import { AgreementForm } from "./agreement-form"
import { Button } from "@/shared/components/ui/button"

export type AgreementDocument = {
  id: string
  displayName: string
  originalName: string
  mimeType: string
  size: number
  type: "DRAFT" | "COUNTERSIGNED"
  notes: string | null
  uploadedAt: string
  uploadedBy: { id: string; name: string }
}

export type AgreementRow = {
  id: string
  title: string
  status: AdhocAgreementStatus
  signedDate: string | null
  totalAmount: string
  createdAt: string
  createdBy: { id: string; name: string }
  deliverables: {
    id: string
    internalId: string | null
    createdAt: string
    title: string
    isArchived: boolean
    status: string
    approvedAmount: string
    financeAmount: string | null
    approverName: string | null
    approvedAt: string | null
    deliveredAt: string | null
    deliveryNoteRef: string | null
    customer: string | null
    client?: ClientIdentity | null
    lineItems: { amount: string }[]
    documents: { id: string }[]
  }[]
  documents: AgreementDocument[]
}

type Props = {
  readonly initialAgreements: AgreementRow[]
  readonly isAdmin: boolean
  readonly isReadOnly?: boolean
}

export function AdhocClient({ initialAgreements, isAdmin, isReadOnly = false }: Props) {
  const [agreements, setAgreements] = useState(initialAgreements)
  const [showForm, setShowForm] = useState(false)
  const searchParams = useSearchParams()
  const initialAgreementId = searchParams.get("agreement") ?? undefined
  const initialDeliverableId = searchParams.get("deliverable") ?? undefined

  const [refreshError, setRefreshError] = useState("")

  async function refresh() {
    setRefreshError("")
    try {
      const res = await fetch("/api/adhoc/agreements")
      if (!res.ok) throw new Error("Refresh failed")
      setAgreements(await res.json())
    } catch {
      setRefreshError("Could not refresh agreements. Please reload the page.")
    }
  }

  return (
    <div>
      {refreshError && <p role="alert" className="text-sm text-red-600">{refreshError}</p>}
      <PageHeader title="Ad Hoc Deliveries" description="Manage ad hoc agreements and work packages"
        actions={!isReadOnly && <Button onClick={() => setShowForm(true)}>New Agreement</Button>} />

      {agreements.length === 0 ? (
        <Panel className="px-5 py-8 text-center">
          <p className="text-sm text-gray-400">No agreements yet. Create one to get started.</p>
        </Panel>
      ) : (
        <AgreementTabs
          key={`${initialAgreementId ?? ""}:${initialDeliverableId ?? ""}`}
          agreements={agreements}
          isAdmin={isAdmin}
          isReadOnly={isReadOnly}
          onRefresh={refresh}
          initialAgreementId={initialAgreementId}
          initialDeliverableId={initialDeliverableId}
        />
      )}

      {showForm && (
        <AgreementForm
          onClose={() => setShowForm(false)}
          onSaved={async () => {
            setShowForm(false)
            await refresh()
          }}
        />
      )}
    </div>
  )
}
