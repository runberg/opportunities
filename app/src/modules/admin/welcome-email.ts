import type { Prisma, SmtpConfig } from "@prisma/client"
import { enqueueEmails } from "@/shared/lib/email-outbox"
import { sealCredentialEmailBody } from "@/shared/lib/credential-email-body"

import { DEFAULT_WELCOME_SUBJECT, DEFAULT_WELCOME_BODY, DEFAULT_RESET_SUBJECT, DEFAULT_RESET_BODY } from "./credential-email-templates"

export async function enqueueCredentialEmail(
  tx: Prisma.TransactionClient,
  user: { id: string; email: string; credentialVersion: number },
  password: string,
  config: SmtpConfig,
  appUrl: string,
  secret: string,
  kind: "welcome" | "reset",
) {
  const loginUrl = new URL("/login", appUrl).toString()
  const vars: Record<string, string> = { email: user.email, password, loginUrl, profileUrl: loginUrl }
  const render = (value: string) => value.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key] ?? "")
  const defaultSubject = kind === "welcome" ? DEFAULT_WELCOME_SUBJECT : DEFAULT_RESET_SUBJECT
  const defaultBody = kind === "welcome" ? DEFAULT_WELCOME_BODY : DEFAULT_RESET_BODY
  const customSubject = kind === "welcome" ? config.welcomeEmailSubject : config.resetEmailSubject
  const customBody = kind === "welcome" ? config.welcomeEmailBody : config.resetEmailBody
  const subject = render(customSubject.trim() && !customSubject.includes("{{password}}") ? customSubject : defaultSubject)
  // Older saved templates may omit the credential. Use the complete default for those.
  const body = customBody.includes("{{password}}") ? customBody.trim() : defaultBody
  const text = render(body === defaultBody ? body : body + "\n\nYou must choose a new password at sign-in.")
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  const sealed = sealCredentialEmailBody({ text, html: `<div style="white-space:pre-wrap">${escaped}</div>` }, secret)
  await enqueueEmails([{
    to: user.email,
    subject,
    text: "",
    html: sealed,
    module: "admin",
    itemId: user.id,
    credentialVersion: user.credentialVersion,
  }], tx)
}
