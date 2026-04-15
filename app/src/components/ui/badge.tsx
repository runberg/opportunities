import { cn } from "@/lib/utils"

interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "success" | "warning" | "danger" | "info" | "purple" | "indigo"
  className?: string
}

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
        {
          "bg-gray-100 text-gray-600": variant === "default",
          "bg-green-100 text-green-700": variant === "success",
          "bg-amber-100 text-amber-700": variant === "warning",
          "bg-red-100 text-red-700": variant === "danger",
          "bg-sky-100 text-sky-700": variant === "info",
          "bg-violet-100 text-violet-700": variant === "purple",
          "bg-indigo-100 text-indigo-700": variant === "indigo",
        },
        className
      )}
    >
      {children}
    </span>
  )
}
