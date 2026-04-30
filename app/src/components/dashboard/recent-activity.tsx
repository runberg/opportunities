"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { timeAgo } from "@/lib/utils"
import { StatusBadge } from "@/components/opportunities/status-badge"
import { OpportunityModal } from "@/components/opportunities/opportunity-modal"

interface RecentOpp {
  id: string
  title: string
  customer: string
  internalId: string | null
  status: string
  updatedAt: string
}

export function RecentActivity({ items, currentUserId, isAdmin }: {
  items: RecentOpp[]
  currentUserId: string
  isAdmin: boolean
}) {
  const router = useRouter()
  const [openId, setOpenId] = useState<string | null>(null)

  if (items.length === 0) return null

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-semibold text-gray-700">Recent Activity</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setOpenId(item.id)}
              className="w-full flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors text-left"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
                  {item.internalId && (
                    <span className="text-xs text-gray-400 shrink-0">{item.internalId}</span>
                  )}
                </div>
                <span className="text-xs text-gray-400">{item.customer}</span>
              </div>
              <StatusBadge status={item.status} />
              <span className="text-xs text-gray-400 shrink-0 w-24 text-right">
                {timeAgo(item.updatedAt)}
              </span>
            </button>
          ))}
        </div>
      </div>

      <OpportunityModal
        opportunityId={openId}
        onClose={() => { setOpenId(null); router.refresh() }}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
      />
    </>
  )
}
