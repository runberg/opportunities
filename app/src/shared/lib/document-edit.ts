import { z } from "zod"

type EnumValues = readonly [string, ...string[]]

/** Validates the body of a document-metadata PATCH (rename / retype / draft-final).
 * Shared by every document route so the rules stay identical; each caller passes the
 * enum values valid for its own document table. Returns the parsed fields, or null if invalid. */
export function parseDocumentEdit(
  body: unknown,
  types: EnumValues,
  statuses?: EnumValues
): { displayName?: string; type?: string; docStatus?: string } | null {
  const schema = z.object({
    displayName: z.string().trim().min(1).max(200).optional(),
    type: z.enum(types).optional(),
    docStatus: (statuses ? z.enum(statuses) : z.undefined()).optional(),
  })
  const parsed = schema.safeParse(body)
  if (!parsed.success) return null
  const { displayName, type, docStatus } = parsed.data
  if (displayName === undefined && type === undefined && docStatus === undefined) return null
  return { displayName, type, docStatus }
}
