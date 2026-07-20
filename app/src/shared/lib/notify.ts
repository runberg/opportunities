import { db } from "./db"
import { sendMail } from "./mailer"
import { NotificationLevel } from "@prisma/client"

const DEFAULT_OPP_SUBJECT = "Opportunity update: {{title}}"
const DEFAULT_OPP_BODY = [
  "An opportunity has been updated:",
  "",
  "{{title}}{{internalId}}",
  "Customer: {{customer}}",
  "",
  "Changes:",
  "{{changes}}",
  "",
  "{{link}}",
  "",
  "---",
  "This is an auto-generated notification. Please do not reply to this email.",
].join("\n")

const DEFAULT_ADHOC_SUBJECT = "Work package update: {{title}}"
const DEFAULT_ADHOC_BODY = [
  "A work package has been updated:",
  "",
  "{{title}}",
  "",
  "Changes:",
  "{{changes}}",
  "",
  "{{link}}",
  "",
  "---",
  "This is an auto-generated notification. Please do not reply to this email.",
].join("\n")

export type NotificationModule = "opportunity" | "adhoc"

export interface NotificationEvent {
  module: NotificationModule
  itemId: string
  actorId: string
  title: string
  internalId?: string | null
  customer?: string
  changes: string[]
  statusChanges: string[]
}

interface PendingEntry {
  timer: ReturnType<typeof setTimeout>
  module: NotificationModule
  itemId: string
  actorId: string
  title: string
  internalId: string | null
  customer: string
  changes: string[]
  statusChanges: string[]
}

type EntryData = Omit<PendingEntry, "timer">

const pending = new Map<string, PendingEntry>()

function scheduleEntry(key: string, data: EntryData, delayMs: number): void {
  const timer = setTimeout(() => {
    const current = pending.get(key)
    pending.delete(key)
    if (current) fireNotification(current).catch((err) => console.error("Notification error:", err))
  }, delayMs)
  pending.set(key, { ...data, timer })
}

export async function scheduleNotification(event: NotificationEvent): Promise<void> {
  if (event.changes.length === 0) return

  const config = await db.smtpConfig.findUnique({ where: { id: "default" } })
  if (!config?.enabled) return

  const delayMs = config.notificationDelayMinutes * 60 * 1000
  const key = `${event.actorId}:${event.itemId}`
  const existing = pending.get(key)

  if (existing) {
    clearTimeout(existing.timer)
    scheduleEntry(key, {
      ...existing,
      changes: [...existing.changes, ...event.changes],
      statusChanges: [...existing.statusChanges, ...event.statusChanges],
    }, delayMs)
    return
  }

  scheduleEntry(key, {
    module: event.module,
    itemId: event.itemId,
    actorId: event.actorId,
    title: event.title,
    internalId: event.internalId ?? null,
    customer: event.customer ?? "",
    changes: event.changes,
    statusChanges: event.statusChanges,
  }, delayMs)
}

function escapeHtml(str: string): string {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#x27;")
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "")
}

function renderHtml(bodyText: string): string {
  const bodyHtml = bodyText
    .split("\n")
    .map((line) => {
      if (line.trim() === "") return "<br>"
      const escaped = escapeHtml(line)
      return `<p style="margin:0 0 4px">${escaped.replace(/(https?:\/\/[^\s<>"&]+)/g, '<a href="$1" style="color:#006fff">$1</a>')}</p>`
    })
    .join("\n")

  return `
    <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a">
      <div style="background:#0a1220;padding:20px 28px;border-radius:8px 8px 0 0">
        <span style="color:#60a5fa;font-size:18px;font-weight:600">Opportunities</span>
        <sup style="color:#fff;font-size:10px;font-weight:700">AI</sup>
      </div>
      <div style="background:#f9fafb;padding:28px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;font-size:14px;line-height:1.6">
        ${bodyHtml}
      </div>
    </div>
  `
}

function getChangesForLevel(entry: PendingEntry, level: NotificationLevel): string[] | null {
  if (level === "STATUS_CHANGES") {
    return entry.statusChanges.length > 0 ? entry.statusChanges : null
  }
  return entry.changes
}

async function fireNotification(entry: PendingEntry): Promise<void> {
  const config = await db.smtpConfig.findUnique({ where: { id: "default" } })
  if (!config?.enabled) return

  const isOpp = entry.module === "opportunity"

  const recipients = await db.user.findMany({
    where: {
      active: true,
      id: { not: entry.actorId },
      ...(isOpp
        ? { opportunityNotifications: { not: "NONE" } }
        : { adhocNotifications: { not: "NONE" } }),
    },
    select: { email: true, opportunityNotifications: true, adhocNotifications: true },
  })
  if (recipients.length === 0) return

  const appUrl = process.env.NEXTAUTH_URL ?? ""
  const subjectTemplate =
    (isOpp ? config.opportunityNotificationSubject : config.adhocNotificationSubject) ||
    (isOpp ? DEFAULT_OPP_SUBJECT : DEFAULT_ADHOC_SUBJECT)
  const bodyTemplate =
    (isOpp ? config.opportunityNotificationBody : config.adhocNotificationBody) ||
    (isOpp ? DEFAULT_OPP_BODY : DEFAULT_ADHOC_BODY)

  const baseVars: Record<string, string> = {
    title: entry.title,
    internalId: entry.internalId ? ` · ${entry.internalId}` : "",
    customer: entry.customer,
    link: appUrl ? `${appUrl}${isOpp ? "/opportunities" : "/adhoc"}` : "",
  }

  for (const recipient of recipients) {
    const level = isOpp ? recipient.opportunityNotifications : recipient.adhocNotifications
    const changes = getChangesForLevel(entry, level)
    if (!changes) continue

    const vars = { ...baseVars, changes: changes.map((c) => `• ${c}`).join("\n") }
    const subject = applyTemplate(subjectTemplate, vars)
    const bodyText = applyTemplate(bodyTemplate, vars)
    await sendMail({ to: recipient.email, subject, html: renderHtml(bodyText), text: bodyText })
  }
}
