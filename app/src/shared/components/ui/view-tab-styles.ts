import { cn } from "@/shared/lib/utils"

export function viewTabClass(active: boolean) {
  return cn(
    "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
    active ? "border-blue-500 bg-blue-100 text-blue-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
  )
}
