import { db } from "@/shared/lib/db"
import { MAX_UPLOAD_BYTES } from "@/shared/lib/upload"
import { DELIVERY_NOTE_MIMES } from "@/shared/lib/file-types"

export function findAllPackages() {
  return db.inventoryPackage.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true, customer: true, internalId: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          utilizations: {
            orderBy: { date: "desc" },
            include: {
              createdBy: { select: { id: true, name: true } },
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

  return { name, comment, opportunityId, file }
}
