import { z } from "zod"
import { db } from "@/shared/lib/db"
import { MAX_UPLOAD_BYTES } from "@/shared/lib/upload"
import { DELIVERY_NOTE_MIMES } from "@/shared/lib/file-types"

export const adhocLinkSelect = { id: true, title: true, agreementId: true } as const

const adhocLinkIdSchema = z.string().trim().nullable().optional()

export async function parseAdhocLink(value: unknown) {
  const parsed = adhocLinkIdSchema.safeParse(value)
  if (!parsed.success) return { error: "Invalid Ad Hoc work package" } as const

  const id = parsed.data === undefined ? undefined : parsed.data || null
  if (id && !(await db.adhocDeliverable.findUnique({ where: { id }, select: { id: true } })))
    return { error: "Ad Hoc work package not found" } as const

  return { adhocDeliverableId: id }
}

export function findAllPackages() {
  return db.inventoryPackage.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      adhocDeliverable: { select: adhocLinkSelect },
      opportunity: { select: { id: true, title: true, customer: true, internalId: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          adhocDeliverable: { select: adhocLinkSelect },
          utilizations: {
            orderBy: { date: "desc" },
            include: {
              createdBy: { select: { id: true, name: true } },
              adhocDeliverable: { select: adhocLinkSelect },
              opportunity: { select: { id: true, title: true, customer: true, internalId: true, status: true } },
            },
          },
        },
      },
    },
  })
}

export type ParsedPackageForm = {
  name: string
  comment: string | null
  opportunityId: string | null
  adhocDeliverableId?: string | null
  file: File | null
}

/** Parses and validates the package create/edit form. Returns an error message, or the parsed fields. */
export async function parsePackageForm(formData: FormData): Promise<{ error: string } | ParsedPackageForm> {
  const name = (formData.get("name") as string | null)?.trim() ?? ""
  const comment = (formData.get("comment") as string | null)?.trim() || null
  const opportunityId = (formData.get("opportunityId") as string | null)?.trim() || null
  const file = formData.get("file") as File | null

  if (!name) return { error: "Name is required" }

  if (file && file.size > 0) {
    if (!DELIVERY_NOTE_MIMES.has(file.type))
      return { error: "Only Word (.docx), PDF, and Excel files are allowed" }
    if (file.size > MAX_UPLOAD_BYTES)
      return { error: "File exceeds 50 MB limit" }
  }

  if (opportunityId && !(await db.opportunity.findUnique({ where: { id: opportunityId } })))
    return { error: "Opportunity not found" }

  const adhocLink = await parseAdhocLink(formData.get("adhocDeliverableId") ?? undefined)
  if (adhocLink.error) return { error: adhocLink.error }

  return { name, comment, opportunityId, file, ...adhocLink }
}
