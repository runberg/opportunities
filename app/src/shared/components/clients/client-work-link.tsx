import Link from "next/link"

export function ClientWorkLink({ kind, workId, linked }: {
  readonly kind: "opportunities" | "adhoc"
  readonly workId: string
  readonly linked: boolean
}) {
  const query = new URLSearchParams({ kind, workId })
  return <Link href={`/clients?${query}`} className="mt-1 inline-block text-xs font-medium text-blue-400 hover:underline">
    {linked ? "Change client" : "Link client"}
  </Link>
}
