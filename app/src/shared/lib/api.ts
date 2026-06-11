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
