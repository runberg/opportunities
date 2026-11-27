import type { ComponentPropsWithoutRef } from "react"
import { cn } from "@/shared/lib/utils"

type PanelProps = ComponentPropsWithoutRef<"section"> & { readonly as?: "section" | "div" }

export function Panel({ as: Element = "section", className, ...props }: PanelProps) {
  return <Element className={cn("min-w-0 rounded-xl border border-gray-200 bg-white", className)} {...props} />
}
