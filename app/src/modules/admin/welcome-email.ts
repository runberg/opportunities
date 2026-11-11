import type { OutboxEmail } from "@/shared/lib/email-outbox"

export function buildWelcomeEmail(email: string, appUrl: string): OutboxEmail {
  const loginUrl = new URL("/login", appUrl).toString()
  const text = [
    "Your Opportunities account has been created.",
    "",
    `Sign in: ${loginUrl}`,
    `Email (username): ${email}`,
    "Initial password: change_me",
    "",
    "On your first login, open Profile and change your password immediately. Enter change_me as your current password and choose a new password with at least 8 characters.",
    "",
    "Please do not reply to this email.",
  ].join("\n")
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  return {
    to: email,
    subject: "Welcome to Opportunities — your account details",
    text,
    html: `<div style="white-space:pre-wrap">${escaped}</div>`,
    module: "admin",
  }
}
