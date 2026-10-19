type PackageAmount = {
  isArchived: boolean
  status: string
  approvedAmount: string
  financeAmount: string | null
}

export function committedAgreementAmount(packages: readonly PackageAmount[]): number {
  return packages
    .filter((d) => !d.isArchived && d.status !== "CANCELLED")
    .reduce((sum, d) => sum + Number(d.status === "CLOSED_FINANCE" && d.financeAmount != null ? d.financeAmount : d.approvedAmount), 0)
}
