import Link from "next/link"
import { cn } from "@/lib/utils"

const PERIODS = [
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
  { key: "year", label: "This year" },
]

export function PeriodSelector({ current }: { current: string }) {
  return (
    <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-1">
      {PERIODS.map((p) => (
        <Link
          key={p.key}
          href={`/dashboard?period=${p.key}`}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap",
            current === p.key
              ? "bg-white text-gray-900 shadow-sm"
              : "text-gray-500 hover:text-gray-700"
          )}
        >
          {p.label}
        </Link>
      ))}
    </div>
  )
}
