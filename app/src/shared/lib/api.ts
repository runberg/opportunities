import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import type { Session } from "next-auth"

type Result =
  | { session: Session; error: null }
  | { session: null; error: NextResponse }

/** Returns a portal session, or an error if authentication or password setup is required. */
export async function requireSession({ allowPasswordSetup = false } = {}): Promise<Result> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (session.user.mustChangePassword && !allowPasswordSetup) {
    return { session: null, error: NextResponse.json({ error: "Choose a new password to continue." }, { status: 403 }) }
  }
  return { session, error: null }
}

/** Returns the session, or a 401/403 response if not authenticated or not admin. */
export async function requireAdmin(): Promise<Result> {
  const result = await requireSession()
  if (result.error) return result
  if (result.session.user.role !== "ADMIN") {
    return { session: null, error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return result
}

export const ACCESS_LEVELS = ["FULL", "READ_ONLY", "NONE"] as const

/**
 * Returns true if the session user has at least the required access level for the given section.
 * Admins always pass. Changes to access levels take effect on next login.
 */
export function hasSectionAccess(
  session: Session,
  section: "opportunities" | "adhoc" | "inventory" | "clients",
  minimum: "READ_ONLY" | "FULL",
): boolean {
  if (session.user.role === "ADMIN") return true
  const level = sectionAccessLevel(session, section)
  if (minimum === "READ_ONLY") return level === "FULL" || level === "READ_ONLY"
  return level === "FULL"
}

function sectionAccessLevel(session: Session, section: "opportunities" | "adhoc" | "inventory" | "clients"): string {
  if (section === "opportunities") return session.user.opportunitiesAccess
  if (section === "adhoc") return session.user.adhocAccess
  if (section === "clients") return session.user.clientsAccess
  return session.user.inventoryAccess
}
