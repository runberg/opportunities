import type { ReactNode } from "react"
import { cn } from "@/shared/lib/utils"

export function PageHeader({ title, description, actions, titleHint, className }: {
  readonly title: string
  readonly description?: ReactNode
  readonly actions?: ReactNode
  readonly titleHint?: string
  readonly className?: string
}) {
  return (
    <header className={cn("mb-6 flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h1 className="break-words text-2xl font-semibold tracking-tight text-gray-900" title={titleHint}>{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-600">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
