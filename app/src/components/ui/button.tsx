import { cn } from "@/lib/utils"
import { ButtonHTMLAttributes, forwardRef } from "react"

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline"
  size?: "sm" | "md" | "lg"
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
          {
            "bg-gray-900 text-white hover:bg-gray-700": variant === "primary",
            "bg-gray-100 text-gray-700 hover:bg-gray-200": variant === "secondary",
            "text-gray-600 hover:bg-gray-100": variant === "ghost",
            "bg-red-600 text-white hover:bg-red-700": variant === "danger",
            "border border-gray-300 text-gray-700 hover:bg-gray-50": variant === "outline",
          },
          {
            "px-2.5 py-1.5 text-xs": size === "sm",
            "px-4 py-2 text-sm": size === "md",
            "px-5 py-2.5 text-base": size === "lg",
          },
          className
        )}
        {...props}
      />
    )
  }
)

Button.displayName = "Button"
