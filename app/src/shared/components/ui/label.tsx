import { cn } from "@/shared/lib/utils"
import { LabelHTMLAttributes } from "react"

type LabelProps = LabelHTMLAttributes<HTMLLabelElement>

export function Label({ className, ...props }: LabelProps) {
  return (
    <label
      className={cn("block text-sm font-medium text-gray-700 mb-1", className)}
      {...props}
    />
  )
}
