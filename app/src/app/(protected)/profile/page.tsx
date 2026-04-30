import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { db } from "@/lib/db"
import { ProfileClient } from "./client"

export default async function ProfilePage() {
  const session = await getServerSession(authOptions)
  const [user, smtp] = await Promise.all([
    db.user.findUnique({
      where: { id: session!.user.id },
      select: { email: true, emailNotifications: true },
    }),
    db.smtpConfig.findUnique({ where: { id: "default" }, select: { enabled: true } }),
  ])

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Profile</h1>
        <p className="text-sm text-gray-500 mt-0.5">Manage your account settings</p>
      </div>
      <ProfileClient
        userEmail={user?.email ?? ""}
        emailNotifications={user?.emailNotifications ?? false}
        notificationsAvailable={smtp?.enabled === true}
      />
    </div>
  )
}
