import { PageHeader } from "@/shared/components/layout/page-header"
import { db } from "@/shared/lib/db"
import { requirePortalPageSession } from "@/shared/lib/page-access"
import { redirect } from "next/navigation"
import { SmtpClient } from "@/modules/admin/components/smtp-client"
import { EmailQueue } from "@/modules/admin/components/email-queue"
import { listQueuedEmails } from "@/shared/lib/email-outbox"

export default async function SmtpPage() {
  const session = await requirePortalPageSession()
  if (session?.user.role !== "ADMIN") redirect("/dashboard")

  const [config, queuedEmails] = await Promise.all([
    db.smtpConfig.findUnique({ where: { id: "default" } }),
    listQueuedEmails(),
  ])

  const initial = config
    ? {
        host: config.host,
        port: config.port,
        secure: config.secure,
        username: config.username,
        fromAddress: config.fromAddress,
        fromName: config.fromName,
        hasPassword: !!config.password,
        enabled: config.enabled,
        notificationDelayMinutes: config.notificationDelayMinutes,
        opportunityNotificationSubject: config.opportunityNotificationSubject,
        opportunityNotificationBody: config.opportunityNotificationBody,
        adhocNotificationSubject: config.adhocNotificationSubject,
        adhocNotificationBody: config.adhocNotificationBody,
        welcomeEmailSubject: config.welcomeEmailSubject,
        welcomeEmailBody: config.welcomeEmailBody,
        resetEmailSubject: config.resetEmailSubject,
        resetEmailBody: config.resetEmailBody,
      }
    : null

  return (
    <div>
      <PageHeader title="Email / SMTP" description="Configure outgoing email for notifications" />
      <div className="space-y-5">
        <SmtpClient initial={initial} />
        <EmailQueue emails={queuedEmails} />
      </div>
    </div>
  )
}
