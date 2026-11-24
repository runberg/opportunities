import { db } from "@/shared/lib/db"
import { requirePortalPageSession } from "@/shared/lib/page-access"
import { redirect } from "next/navigation"
import { AdminUsersClient } from "@/modules/admin/components/users-client"

export default async function AdminUsersPage() {
  const session = await requirePortalPageSession()
  if (session?.user.role !== "ADMIN") redirect("/dashboard")

  const users = await db.user.findMany({
    orderBy: { email: "asc" },
    select: { id: true, email: true, role: true, active: true, createdAt: true, lastLoginAt: true, passwordChangedAt: true, temporaryPasswordExpiresAt: true, opportunitiesAccess: true, adhocAccess: true, inventoryAccess: true, clientsAccess: true },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} registered users</p>
      </div>
      <AdminUsersClient users={users.map((user) => ({ ...user, recoveryAdmin: user.email === process.env.ADMIN_EMAIL }))} currentUserId={session.user.id} />
    </div>
  )
}
