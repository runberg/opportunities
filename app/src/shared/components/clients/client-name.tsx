"use client"

import Link from "next/link"

export type ClientIdentity = { id: string; name?: string }

export function ClientName({ label, client, onNavigate }: {
  readonly label: string
  readonly client?: ClientIdentity | null
  readonly onNavigate?: () => void
}) {
  if (!client) return <span title={label}>{label}</span>
  return (
    <Link href={`/clients/${client.id}`} title={client.name ?? label} onNavigate={onNavigate}
      onClick={(event) => event.stopPropagation()} className="text-blue-600 hover:underline dark:text-blue-300">
      {label}
    </Link>
  )
}
