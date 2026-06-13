"use client"

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
      <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={[
              "px-4 py-2 text-sm font-medium rounded-t-md border border-b-0 transition-colors",
              activeTab === tab.id
                ? "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100"
                : "bg-gray-50 dark:bg-gray-900 border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200",
            ].join(" ")}
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
