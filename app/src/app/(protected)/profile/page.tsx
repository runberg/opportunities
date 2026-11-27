import { PageHeader } from "@/shared/components/layout/page-header"
import { requirePortalPageSession } from "@/shared/lib/page-access"
import { db } from "@/shared/lib/db"
import { ProfileClient } from "@/shared/components/profile/client"

export default async function ProfilePage() {
  const session = await requirePortalPageSession()
  const [user, smtp] = await Promise.all([
    db.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, opportunityNotifications: true, adhocNotifications: true },
    }),
    db.smtpConfig.findUnique({ where: { id: "default" }, select: { enabled: true } }),
  ])

  return (
    <div>
      <PageHeader title="Profile" description="Manage your account settings" />
      <ProfileClient
        userName={user?.name ?? ""}
        userEmail={user?.email ?? ""}
        opportunityNotifications={user?.opportunityNotifications ?? "NONE"}
        adhocNotifications={user?.adhocNotifications ?? "NONE"}
        notificationsAvailable={smtp?.enabled === true}
      />
    </div>
  )
}
