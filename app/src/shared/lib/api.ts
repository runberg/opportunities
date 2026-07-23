import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import type { Session } from "next-auth"

type Result =
  | { session: Session; error: null }
  | { session: null; error: NextResponse }

/** Returns the session, or a 401 response if unauthenticated. */
export async function requireSession(): Promise<Result> {
  const session = await getServerSession(authOptions)
  if (!session) {
    return { session: null, error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
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
  section: "opportunities" | "adhoc",
  minimum: "READ_ONLY" | "FULL",
): boolean {
  if (session.user.role === "ADMIN") return true
  const level = section === "opportunities" ? session.user.opportunitiesAccess : session.user.adhocAccess
  if (minimum === "READ_ONLY") return level === "FULL" || level === "READ_ONLY"
  return level === "FULL"
}
