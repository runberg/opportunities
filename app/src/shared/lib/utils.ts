import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Returns today as YYYY-MM-DD in local (browser/server) time, safe for date inputs. */
export function todayISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Returns a date N days ago as YYYY-MM-DD in local time. */
export function daysAgoISO(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/** Extracts the YYYY-MM-DD portion from a Date, ISO string, or nullish value. */
export function toDateString(date: Date | string | null | undefined): string {
  if (!date) return ""
  const s = typeof date === "string" ? date : date.toISOString()
  return s.split("T")[0]
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${Number.parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
}

export function truncateFilename(name: string, maxLength = 32): string {
  if (name.length <= maxLength) return name
  const dot = name.lastIndexOf(".")
  if (dot <= 0) return name.slice(0, maxLength - 3) + "…"
  const ext = name.slice(dot)
  const keep = maxLength - ext.length - 1
  return keep > 0 ? name.slice(0, keep) + "…" + ext : name.slice(0, maxLength - 1) + "…"
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy")
}

export function formatDateTime(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy, HH:mm")
}

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function initials(name: string): string {
  // Handle email addresses: use local part before @
  const local = name.includes("@") ? name.split("@")[0] : name
  // Split on dots, hyphens, underscores, or spaces
  const parts = local.split(/[.\-_ ]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return local.slice(0, 2).toUpperCase()
}

export const STATUS_SHORT_LABELS: Record<string, string> = {
  NEW: "New",
  RFQ_RECEIVED: "RFQ Rcvd",
  QUOTE_SENT: "Quoted",
  EL_REQUEST_RECEIVED: "EL Req",
  EL_DRAFT_SHARED: "EL Draft",
  EL_SIGNED_SHARED: "Signed Shared",
  EL_FULLY_SIGNED: "Countersigned",
  PENDING_ADVANCE_PAYMENT: "Adv. Payment",
  IN_PRODUCTION: "In Prod.",
  PRODUCTION: "In Prod.",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

export const STATUS_LABELS: Record<string, string> = {
  NEW: "New",
  RFQ_RECEIVED: "RFQ Received",
  QUOTE_SENT: "Quote Sent",
  EL_REQUEST_RECEIVED: "EL Requested",
  EL_DRAFT_SHARED: "EL Draft Shared",
  EL_SIGNED_SHARED: "EL Signed Shared",
  EL_FULLY_SIGNED: "EL Fully Signed",
  PENDING_ADVANCE_PAYMENT: "Pending Advance Payment",
  IN_PRODUCTION: "In Production",
  PRODUCTION: "In Production",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

// Statuses available in each workflow stage
export const QUOTE_STATUSES = ["RFQ_RECEIVED", "QUOTE_SENT"] as const
export const EL_STATUSES = ["EL_REQUEST_RECEIVED", "EL_DRAFT_SHARED", "EL_SIGNED_SHARED", "EL_FULLY_SIGNED"] as const
export const PRODUCTION_STATUSES = [
  "PENDING_ADVANCE_PAYMENT",
  "IN_PRODUCTION",
  "PRODUCTION", // legacy
  "DELIVERED",
] as const

// Grouped for the filter dropdowns
export const STATUS_GROUPS = [
  {
    label: "Quote",
    statuses: ["RFQ_RECEIVED", "QUOTE_SENT"],
  },
  {
    label: "Engagement Letter",
    statuses: [
      "EL_REQUEST_RECEIVED",
      "EL_DRAFT_SHARED",
      "EL_SIGNED_SHARED",
      "EL_FULLY_SIGNED",
    ],
  },
  {
    label: "Production",
    statuses: ["PENDING_ADVANCE_PAYMENT", "IN_PRODUCTION", "DELIVERED"],
  },
]

export const PENDING_LABELS: Record<string, string> = {
  INTERNAL: "Internal",
  CUSTOMER: "Customer",
  THIRD_PARTY: "Third party",
  NONE: "—",
}

export const WAITING_LABELS: Record<string, string> = {
  INTERNAL: "Internal",
  CUSTOMER: "Customer",
  THIRD_PARTY: "Third party",
  NONE: "None",
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  QUOTE: "Quote",
  EL: "EL",
  FAT: "FAT",
  SAT: "SAT",
  OTHER: "Other",
}

export const DOC_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  FINAL: "Final",
}

export const ALL_STATUSES = Object.keys(STATUS_LABELS)

export const PIPELINE_STATUSES = [
  "RFQ_RECEIVED", "QUOTE_SENT",
  "EL_REQUEST_RECEIVED", "EL_DRAFT_SHARED", "EL_SIGNED_SHARED", "EL_FULLY_SIGNED",
  "PENDING_ADVANCE_PAYMENT", "IN_PRODUCTION", "DELIVERED",
] as const

export function getDropZoneCls(dragging: boolean, hasFile: boolean): string {
  if (dragging) return "border-[#006fff] bg-blue-50 dark:bg-blue-900/10"
  if (hasFile) return "border-green-400 bg-green-50 dark:bg-green-900/10"
  return "border-gray-300 dark:border-gray-600 hover:border-gray-400"
}

export function formatAmount(amount: string | number): string {
  return Number(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function nameFromFile(f: File): string {
  return f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim()
}

export function parseParam(val: string | undefined, fallback: number): number {
  const n = val ? Number.parseInt(val, 10) : Number.NaN
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function buildOpportunityWhere(
  query: string,
  selectedStatuses: string[],
  defaultStatuses: readonly string[]
) {
  return {
    AND: [
      query
        ? {
            OR: [
              { title: { contains: query, mode: "insensitive" as const } },
              { customer: { contains: query, mode: "insensitive" as const } },
              { reference: { contains: query, mode: "insensitive" as const } },
              { internalId: { contains: query, mode: "insensitive" as const } },
              { product: { contains: query, mode: "insensitive" as const } },
            ],
          }
        : {},
      {
        status: {
          in: (selectedStatuses.length > 0
            ? selectedStatuses
            : [...defaultStatuses]) as never[],
        },
      },
    ],
  }
}

export const ACTIVE_STATUSES = [
  "NEW",
  "RFQ_RECEIVED",
  "QUOTE_SENT",
  "EL_REQUEST_RECEIVED",
  "EL_DRAFT_SHARED",
  "EL_SIGNED_SHARED",
  "EL_FULLY_SIGNED",
  "PENDING_ADVANCE_PAYMENT",
  "IN_PRODUCTION",
  "PRODUCTION",
]
