import { cn } from "@/shared/lib/utils"
import { TextareaHTMLAttributes, forwardRef } from "react"

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-400 resize-none",
          "focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400",
          "disabled:bg-gray-50 disabled:text-gray-500",
          className
        )}
        {...props}
      />
    )
  }
)

Textarea.displayName = "Textarea"
