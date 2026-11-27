"use client"

import { viewTabClass } from "@/shared/components/ui/view-tab-styles"
import { useState } from "react"
import { DeleteOpportunitiesClient } from "@/modules/opportunities/components/delete-opportunities"
import { DeleteAdhocClient } from "@/modules/admin/components/delete-adhoc"

const TABS = [
  { id: "opportunities", label: "Opportunities" },
  { id: "adhoc",         label: "Ad Hoc" },
] as const

type TabId = (typeof TABS)[number]["id"]

export function DeletePageTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("opportunities")

  return (
    <div>
      {/* Tab bar */}
      <div className="mb-5 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-pressed={activeTab === tab.id}
            className={viewTabClass(activeTab === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "opportunities" && <DeleteOpportunitiesClient />}
      {activeTab === "adhoc" && <DeleteAdhocClient />}
    </div>
  )
}
