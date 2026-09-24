import type { DocTypeOption } from "@/shared/components/ui/doc-edit-form"

export type DocKind = "QUOTE" | "EL" | "FAT" | "SAT" | "DELIVERY" | "OTHER"

export const KIND_LABEL: Record<DocKind, string> = {
  QUOTE: "Quote", EL: "EL", FAT: "FAT", SAT: "SAT", DELIVERY: "Delivery", OTHER: "Other",
}

const KIND_GROUP: Record<DocKind, string> = {
  QUOTE: "Quote", EL: "Engagement Letter", FAT: "Production", SAT: "Production", DELIVERY: "Production", OTHER: "Production",
}

/** Kinds shown together in the Production Documents section. */
export const PRODUCTION_DOC_KINDS: readonly DocKind[] = ["FAT", "SAT", "DELIVERY", "OTHER"]

/** Every kind a document can be moved between, depending on how far the opportunity has
 * progressed — each stage adds a section (Quote → EL → Production). */
export const QUOTE_STAGE_KINDS: readonly DocKind[] = ["QUOTE"]
export const EL_STAGE_KINDS: readonly DocKind[] = ["QUOTE", "EL"]
export const PRODUCTION_STAGE_KINDS: readonly DocKind[] = ["QUOTE", "EL", ...PRODUCTION_DOC_KINDS]

/** Dropdown options for a set of kinds, grouped by the section each one lives in. */
export function kindOptions(kinds: readonly DocKind[]): DocTypeOption[] {
  return kinds.map((k) => ({ value: k, label: KIND_LABEL[k], group: KIND_GROUP[k] }))
}
