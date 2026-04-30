import { db } from "@/lib/db"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { SmtpClient } from "./client"

export default async function SmtpPage() {
  const session = await getServerSession(authOptions)
  if (session?.user.role !== "ADMIN") redirect("/dashboard")

  const config = await db.smtpConfig.findUnique({ where: { id: "default" } })

  const initial = config
    ? {
        host: config.host,
        port: config.port,
        secure: config.secure,
        username: config.username,
        fromAddress: config.fromAddress,
        fromName: config.fromName,
        hasPassword: true,
        enabled: config.enabled,
        notificationSubject: config.notificationSubject,
        notificationBody: config.notificationBody,
      }
    : null

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Email / SMTP</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure outgoing email for notifications</p>
      </div>
      <SmtpClient initial={initial} />
    </div>
  )
}
