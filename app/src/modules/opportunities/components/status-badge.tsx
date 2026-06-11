import { cn } from "@/shared/lib/utils"
import { STATUS_LABELS, STATUS_SHORT_LABELS, PENDING_LABELS } from "@/shared/lib/utils"

const STATUS_STYLES: Record<string, string> = {
  NEW: "bg-gray-100 text-gray-600",
  RFQ_RECEIVED: "bg-amber-100 text-amber-700",
  QUOTE_SENT: "bg-green-100 text-green-700",
  EL_REQUEST_RECEIVED: "bg-red-100 text-red-700",
  EL_DRAFT_SHARED: "bg-yellow-100 text-yellow-700",
  EL_SIGNED_SHARED: "bg-green-100 text-green-700",
  EL_FULLY_SIGNED: "bg-emerald-600 text-white",
  PENDING_ADVANCE_PAYMENT: "bg-red-100 text-red-700",
  IN_PRODUCTION: "bg-blue-100 text-blue-800",
  PRODUCTION: "bg-blue-100 text-blue-800",
  DELIVERED: "bg-green-500 text-white",
  CANCELLED: "bg-red-100 text-red-700",
}

const PENDING_STYLES: Record<string, string> = {
  INTERNAL: "bg-amber-100 text-amber-700",
  CUSTOMER: "bg-green-100 text-green-700",
  THIRD_PARTY: "bg-purple-100 text-purple-700",
  NONE: "",
}

export function StatusBadge({ status, short = false }: { status: string; short?: boolean }) {
  const label = short
    ? (STATUS_SHORT_LABELS[status] ?? STATUS_LABELS[status] ?? status)
    : (STATUS_LABELS[status] ?? status)
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        STATUS_STYLES[status] ?? "bg-gray-100 text-gray-600"
      )}
    >
      {label}
    </span>
  )
}

export function PendingBadge({ waitingOn }: { waitingOn: string }) {
  if (waitingOn === "NONE") return null
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap",
        PENDING_STYLES[waitingOn] ?? "bg-gray-100 text-gray-600"
      )}
    >
      {PENDING_LABELS[waitingOn] ?? waitingOn}
    </span>
  )
}
