import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import { redirect } from "next/navigation"
import type { Session } from "next-auth"

export type SectionAccess = {
  session: Session
  isAdmin: boolean
  isReadOnly: boolean
}

/**
 * Enforces section-level access for page components.
 * Redirects to /login if unauthenticated, or to redirectOnNone (default /dashboard) if
 * the user's access to the section is NONE.
 * Returns { session, isAdmin, isReadOnly } for READ_ONLY or FULL access.
 */
export async function requireSectionAccess(
  section: "opportunities" | "adhoc",
  redirectOnNone = "/dashboard",
): Promise<SectionAccess> {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  const isAdmin = session.user.role === "ADMIN"
  const access = section === "opportunities"
    ? session.user.opportunitiesAccess
    : session.user.adhocAccess
  if (!isAdmin && access === "NONE") redirect(redirectOnNone)
  const isReadOnly = !isAdmin && access === "READ_ONLY"
  return { session, isAdmin, isReadOnly }
}

/**
 * Like requireSectionAccess, but additionally redirects READ_ONLY users.
 * Use for write-only pages (create, edit) where READ_ONLY access should redirect.
 */
export async function requireFullSectionAccess(
  section: "opportunities" | "adhoc",
  redirectTo: string,
): Promise<Pick<SectionAccess, "session" | "isAdmin">> {
  const { session, isAdmin, isReadOnly } = await requireSectionAccess(section)
  if (isReadOnly) redirect(redirectTo)
  return { session, isAdmin }
}
