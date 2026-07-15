"use client"

import Link from "next/link"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { cn, todayISO, daysAgoISO } from "@/shared/lib/utils"
import { DatePicker } from "@/shared/components/ui/date-picker"

const PERIODS = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "year", label: "This year" },
]

export function PeriodSelector({
  current,
  currentFrom,
  currentTo,
}: {
  readonly current: string
  readonly currentFrom?: string
  readonly currentTo?: string
}) {
  const router = useRouter()
  const isCustom = current === "custom"

  const [showPicker, setShowPicker] = useState(isCustom)
  const [from, setFrom] = useState(currentFrom ?? daysAgoISO(30))
  const [to, setTo] = useState(currentTo ?? todayISO())

  function apply() {
    if (!from || !to) return
    router.push(`/dashboard?period=custom&from=${from}&to=${to}`)
    setShowPicker(false)
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
        {PERIODS.map((p) => (
          <Link
            key={p.key}
            href={`/dashboard?period=${p.key}`}
            onClick={() => setShowPicker(false)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
              current === p.key && !showPicker
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            {p.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setShowPicker((v) => !v)}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
            isCustom || showPicker
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          Custom
        </button>
      </div>

      {showPicker && (
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">From</span>
            <DatePicker
              value={from}
              max={to}
              onChange={setFrom}
              triggerClassName="text-xs text-gray-900 border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400 flex items-center min-w-[100px]"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-400">To</span>
            <DatePicker
              value={to}
              min={from}
              max={todayISO()}
              onChange={setTo}
              triggerClassName="text-xs text-gray-900 border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gray-400 flex items-center min-w-[100px]"
            />
          </div>
          <button
            type="button"
            onClick={apply}
            disabled={!from || !to || from > to}
            className="px-3 py-1.5 bg-[#006fff] text-white text-xs font-medium rounded-lg hover:bg-[#005ee6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Apply
          </button>
        </div>
      )}
    </div>
  )
}
