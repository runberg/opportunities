"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Check, Minus } from "lucide-react"
import { StatusBadge, PendingBadge } from "@/components/opportunities/status-badge"
import { OpportunityModal } from "@/components/opportunities/opportunity-modal"

export interface ProductionRow {
  id: string
  internalId: string | null
  title: string
  customer: string
  reference: string | null
  product: string | null
  status: string
  waitingOn: string
  advancePaymentDate: string | null
  fatPassedDate: string | null
  satApplicable: boolean
  satPassedDate: string | null
  deliveredDate: string | null
  _count: { comments: number; documents: number }
}

function PhaseCell({ done, na = false }: { done: boolean; na?: boolean }) {
  if (na) return <Minus size={13} className="text-gray-300" />
  if (done) return <Check size={13} className="text-green-500" />
  return <span className="w-3 h-3 rounded-full border-2 border-gray-300 inline-block" />
}

export function ProductionTable({
  opportunities,
  currentUserId,
  isAdmin,
}: {
  opportunities: ProductionRow[]
  currentUserId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [openModalId, setOpenModalId] = useState<string | null>(null)

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Title</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Customer</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Product</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Adv. Pay</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">FAT</th>
              <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">SAT</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Status</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden lg:table-cell">Pending</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {opportunities.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-gray-400">
                  No production items found.
                </td>
              </tr>
            )}
            {opportunities.map((opp) => (
              <tr
                key={opp.id}
                onClick={() => setOpenModalId(opp.id)}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
              >
                <td className="px-4 py-3">
                  <span className="font-medium text-gray-900">{opp.title}</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    {opp.internalId && <span className="text-xs text-gray-400">{opp.internalId}</span>}
                    {opp.reference && <span className="text-xs text-gray-400">{opp.reference}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{opp.customer}</td>
                <td className="px-4 py-3 text-gray-500 max-w-xs truncate hidden lg:table-cell">
                  {opp.product ?? "—"}
                </td>
                <td className="px-3 py-3 text-center hidden md:table-cell">
                  <PhaseCell done={!!opp.advancePaymentDate} />
                </td>
                <td className="px-3 py-3 text-center hidden md:table-cell">
                  <PhaseCell done={!!opp.fatPassedDate} />
                </td>
                <td className="px-3 py-3 text-center hidden md:table-cell">
                  <PhaseCell done={!!opp.satPassedDate} na={!opp.satApplicable} />
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={opp.status} short />
                </td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <PendingBadge waitingOn={opp.waitingOn} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <OpportunityModal
        opportunityId={openModalId}
        onClose={() => { setOpenModalId(null); router.refresh() }}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </>
  )
}
