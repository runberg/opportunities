import type { OutboxEmail } from "@/shared/lib/email-outbox"

export const INITIAL_USER_PASSWORD = "change_me"
export const DEFAULT_WELCOME_SUBJECT = "Welcome to Opportunities — your account details"
export const DEFAULT_WELCOME_BODY = [
  "Your Opportunities account has been created.",
  "",
  "Sign in: {{loginUrl}}",
  "Email (username): {{email}}",
  "Initial password: {{password}}",
  "",
  "On your first login, open Profile ({{profileUrl}}) and change your password immediately. Enter {{password}} as your current password and choose a new password with at least 8 characters.",
  "",
  "Please do not reply to this email.",
].join("\n")

interface WelcomeEmailTemplate {
  welcomeEmailSubject?: string
  welcomeEmailBody?: string
}

export function buildWelcomeEmail(email: string, appUrl: string, template: WelcomeEmailTemplate = {}): OutboxEmail {
  const vars: Record<string, string> = {
    email,
    password: INITIAL_USER_PASSWORD,
    loginUrl: new URL("/login", appUrl).toString(),
    profileUrl: new URL("/profile", appUrl).toString(),
  }
  const render = (value: string) => value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "")
  const subject = render(template.welcomeEmailSubject?.trim() || DEFAULT_WELCOME_SUBJECT)
  const text = render(template.welcomeEmailBody?.trim() || DEFAULT_WELCOME_BODY)
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return {
    to: email,
    subject,
    text,
    html: `<div style="white-space:pre-wrap">${escaped}</div>`,
    module: "admin",
  }
}
