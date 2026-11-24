import { Prisma } from "@prisma/client"
import { NextResponse } from "next/server"
import { hasSectionAccess, requireSession } from "@/shared/lib/api"
import { ClientConflict } from "./data"

export async function requireClientsWrite() {
  const result = await requireSession()
  if (result.error) return result
  if (!hasSectionAccess(result.session, "clients", "FULL")) {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) } as const
  }
  return result
}

export function clientApiError(error: unknown): NextResponse {
  if (error instanceof ClientConflict) return NextResponse.json({ error: error.message }, { status: 409 })
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return NextResponse.json({ error: "This code name is already in use." }, { status: 409 })
    if (error.code === "P2025" || error.code === "P2003") {
      return NextResponse.json({ error: "The client or work item no longer exists." }, { status: 404 })
    }
  }
  throw error
}
