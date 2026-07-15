"use client"

import { useState } from "react"
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
    status: string
    approvedAmount: string
    lineItems: { amount: string }[]
    documents: { id: string }[]
  }[]
  documents: AgreementDocument[]
}

type Props = {
  readonly initialAgreements: AgreementRow[]
  readonly currentUserId: string
  readonly isAdmin: boolean
}

export function AdhocClient({ initialAgreements, currentUserId, isAdmin }: Props) {
  const [agreements, setAgreements] = useState(initialAgreements)
  const [showForm, setShowForm] = useState(false)

  async function refresh() {
    const res = await fetch("/api/adhoc/agreements")
    if (res.ok) setAgreements(await res.json())
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Ad Hoc Deliveries</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Manage ad hoc agreements and work packages
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setShowForm(true)}>
          + New Agreement
        </Button>
      </div>

      {agreements.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <p className="text-sm text-gray-400">No agreements yet. Create one to get started.</p>
        </div>
      ) : (
        <AgreementTabs
          agreements={agreements}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          onRefresh={refresh}
        />
      )}

      {showForm && (
        <AgreementForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false)
            refresh()
          }}
        />
      )}
    </div>
  )
}
