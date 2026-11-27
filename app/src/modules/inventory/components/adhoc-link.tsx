import Link from "next/link"
import { OpportunityPicker } from "./opportunity-picker"

export type AdhocLink = { id: string; title: string; agreementId: string }
type Selection = Pick<AdhocLink, "id" | "title">

export function AdhocPicker({ id, value, onChange }: {
  readonly id: string
  readonly value: Selection | null
  readonly onChange: (value: Selection | null) => void
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium mb-1">Ad Hoc work package (optional)</label>
      <OpportunityPicker id={id} kind="adhoc" value={value?.id ?? null} label={value?.title ?? null} onChange={onChange} />
    </div>
  )
}

export function AdhocWorkPackageLink({ workPackage }: { readonly workPackage: AdhocLink }) {
  return (
    <Link
      href={{ pathname: "/adhoc", query: { agreement: workPackage.agreementId, deliverable: workPackage.id } }}
      className="block truncate text-sm text-blue-700 hover:underline"
      title={workPackage.title}
    >
      Ad Hoc · {workPackage.title}
    </Link>
  )
}
