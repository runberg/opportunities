import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { AdminUsersClient } from "./client"

export default async function AdminUsersPage() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== "ADMIN") redirect("/dashboard")

  const users = await db.user.findMany({
    orderBy: { email: "asc" },
    select: { id: true, email: true, role: true, active: true, createdAt: true },
  })

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500 mt-0.5">{users.length} registered users</p>
      </div>
      <AdminUsersClient users={users} currentUserId={session!.user.id} />
    </div>
  )
}
