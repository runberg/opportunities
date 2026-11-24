import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import { redirect } from "next/navigation"
import type { Session } from "next-auth"

export async function requirePortalPageSession(): Promise<Session> {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")
  if (session.user.mustChangePassword) redirect("/choose-password")
  return session
}

export type SectionName = "opportunities" | "adhoc" | "inventory" | "clients"

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
  section: SectionName,
  redirectOnNone = "/dashboard",
): Promise<SectionAccess> {
  const session = await requirePortalPageSession()
  const isAdmin = session.user.role === "ADMIN"
  const access = sectionAccessLevel(section, session)
  if (!isAdmin && access === "NONE") {
    if (session.user.opportunitiesAccess === "NONE" && session.user.adhocAccess === "NONE") {
      if (session.user.clientsAccess !== "NONE") redirect("/clients")
      if (session.user.inventoryAccess !== "NONE") redirect("/inventory")
      redirect("/profile")
    }
    redirect(redirectOnNone)
  }
  const isReadOnly = !isAdmin && access === "READ_ONLY"
  return { session, isAdmin, isReadOnly }
}

function sectionAccessLevel(section: SectionName, session: Session): string {
  if (section === "opportunities") return session.user.opportunitiesAccess
  if (section === "adhoc") return session.user.adhocAccess
  if (section === "clients") return session.user.clientsAccess
  return session.user.inventoryAccess
}

/**
 * Like requireSectionAccess, but additionally redirects READ_ONLY users.
 * Use for write-only pages (create, edit) where READ_ONLY access should redirect.
 */
export async function requireFullSectionAccess(
  section: SectionName,
  redirectTo: string,
): Promise<Pick<SectionAccess, "session" | "isAdmin">> {
  const { session, isAdmin, isReadOnly } = await requireSectionAccess(section)
  if (isReadOnly) redirect(redirectTo)
  return { session, isAdmin }
}
