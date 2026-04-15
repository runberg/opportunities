import { cn } from "@/lib/utils"
import { InputHTMLAttributes, forwardRef } from "react"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-400",
          "focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400",
          "disabled:bg-gray-50 disabled:text-gray-500",
          className
        )}
        {...props}
      />
    )
  }
)

Input.displayName = "Input"
