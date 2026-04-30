import nodemailer from "nodemailer"
import { db } from "./db"

export async function getSmtpConfig() {
  return db.smtpConfig.findUnique({ where: { id: "default" } })
}

export async function sendMail(opts: {
  to: string | string[]
  subject: string
  html: string
  text?: string
}) {
  const config = await getSmtpConfig()
  if (!config) throw new Error("SMTP not configured")

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: { user: config.username, pass: config.password },
  })

  await transporter.sendMail({
    from: `"${config.fromName}" <${config.fromAddress}>`,
    to: Array.isArray(opts.to) ? opts.to.join(", ") : opts.to,
    subject: opts.subject,
    html: opts.html,
    text: opts.text,
  })
}
