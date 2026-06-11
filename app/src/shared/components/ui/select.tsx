import { cn } from "@/shared/lib/utils"
import { SelectHTMLAttributes, forwardRef } from "react"

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className={cn(
          "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900",
          "focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400",
          "disabled:bg-gray-50 disabled:text-gray-500",
          className
        )}
        {...props}
      >
        {children}
      </select>
    )
  }
)

Select.displayName = "Select"
