import { db } from "./db"
import { sendMail } from "./mailer"
import { STATUS_LABELS } from "./utils"

const DEBOUNCE_MS = 3 * 60 * 1000 // 3 minutes

const DEFAULT_SUBJECT = "Opportunity update: {{title}}"
const DEFAULT_BODY = `An opportunity has been updated:

{{title}}{{internalId}}
Customer: {{customer}}
Status: {{status}}

{{link}}`

interface Pending {
  timer: ReturnType<typeof setTimeout>
  title: string
  internalId: string | null
  customer: string
  newStatus: string
  actorEmail: string
  opportunityId: string
}

const pending = new Map<string, Pending>()

export function scheduleStatusNotification(opts: {
  opportunityId: string
  title: string
  internalId: string | null
  customer: string
  newStatus: string
  actorEmail: string
}) {
  const existing = pending.get(opts.opportunityId)
  if (existing) clearTimeout(existing.timer)

  const timer = setTimeout(() => {
    pending.delete(opts.opportunityId)
    fireNotification(opts).catch((err) =>
      console.error("Status notification failed:", err)
    )
  }, DEBOUNCE_MS)

  pending.set(opts.opportunityId, { ...opts, timer })
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? "")
}

async function fireNotification(opts: {
  opportunityId: string
  title: string
  internalId: string | null
  customer: string
  newStatus: string
  actorEmail: string
}) {
  const config = await db.smtpConfig.findUnique({ where: { id: "default" } })
  if (!config || !config.enabled) return

  const recipients = await db.user.findMany({
    where: { active: true, emailNotifications: true },
    select: { email: true },
  })
  if (recipients.length === 0) return

  const appUrl = process.env.NEXTAUTH_URL ?? ""
  const statusLabel = STATUS_LABELS[opts.newStatus] ?? opts.newStatus

  const vars: Record<string, string> = {
    title: opts.title,
    internalId: opts.internalId ? ` · ${opts.internalId}` : "",
    customer: opts.customer,
    status: statusLabel,
    link: appUrl ? `${appUrl}/opportunities` : "",
  }

  const subjectTemplate = config.notificationSubject || DEFAULT_SUBJECT
  const bodyTemplate = config.notificationBody || DEFAULT_BODY

  const subject = applyTemplate(subjectTemplate, vars)
  const bodyText = applyTemplate(bodyTemplate, vars)

  // Render plain text body into branded HTML
  const bodyHtml = bodyText
    .split("\n")
    .map((line) => {
      if (line.trim() === "") return "<br>"
      // Turn bare URLs into links
      return `<p style="margin:0 0 4px">${line.replace(/(https?:\/\/\S+)/g, '<a href="$1" style="color:#006fff">$1</a>')}</p>`
    })
    .join("\n")

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <div style="background:#0a1220;padding:20px 28px;border-radius:8px 8px 0 0">
        <span style="color:#60a5fa;font-size:18px;font-weight:600">Opportunities</span>
        <sup style="color:#fff;font-size:10px;font-weight:700">AI</sup>
      </div>
      <div style="background:#f9fafb;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;font-size:14px;line-height:1.6">
        ${bodyHtml}
      </div>
      <p style="color:#9ca3af;font-size:11px;text-align:center;margin-top:12px">
        You are receiving this because you have email notifications enabled.
        Change this in your profile settings.
      </p>
    </div>
  `

  await sendMail({
    to: recipients.map((r) => r.email),
    subject,
    html,
    text: bodyText,
  })
}
