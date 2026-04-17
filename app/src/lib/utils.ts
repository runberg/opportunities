import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { format, formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`
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

export const STATUS_SHORT_LABELS: Record<string, string> = {
  NEW: "New",
  RFQ_RECEIVED: "RFQ Rcvd",
  QUOTE_SENT: "Quoted",
  EL_REQUEST_RECEIVED: "EL Req",
  EL_DRAFT_SHARED: "EL Draft",
  EL_SIGNED_SHARED: "EL Signed",
  EL_FULLY_SIGNED: "EL Full",
  PRODUCTION: "Prod",
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
  PRODUCTION: "Production",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
}

// Statuses available in each workflow stage
export const QUOTE_STATUSES = ["RFQ_RECEIVED", "QUOTE_SENT"] as const
export const EL_STATUSES = ["EL_REQUEST_RECEIVED", "EL_DRAFT_SHARED", "EL_SIGNED_SHARED"] as const

// Grouped for the form dropdown — makes the flow clearer
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
    label: "Outcome",
    statuses: ["PRODUCTION", "DELIVERED", "CANCELLED"],
  },
]

export const PENDING_LABELS: Record<string, string> = {
  INTERNAL: "Internal",
  CUSTOMER: "Customer",
  NONE: "—",
}

export const DOC_TYPE_LABELS: Record<string, string> = {
  QUOTE: "Quote",
  EL: "EL",
  OTHER: "Other",
}

export const DOC_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  FINAL: "Final",
}

export const ALL_STATUSES = Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]

export const ACTIVE_STATUSES = [
  "NEW",
  "RFQ_RECEIVED",
  "QUOTE_SENT",
  "EL_REQUEST_RECEIVED",
  "EL_DRAFT_SHARED",
  "EL_SIGNED_SHARED",
  "EL_FULLY_SIGNED",
  "PRODUCTION",
]
