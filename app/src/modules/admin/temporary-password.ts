import { randomBytes } from "node:crypto"
import bcrypt from "bcryptjs"
import { db } from "@/shared/lib/db"
import { z } from "zod"

export const credentialDelivery = z.enum(["email", "manual"]).default("email")

export async function prepareTemporaryPassword(delivery: "email" | "manual") {
  const config = delivery === "email" ? await db.smtpConfig.findUnique({ where: { id: "default" } }) : null
  const appUrl = process.env.NEXTAUTH_URL
  const secret = process.env.NEXTAUTH_SECRET
  if (delivery === "email" && (!config?.enabled || !appUrl || !secret)) return null

  const password = randomBytes(18).toString("base64url")
  return {
    password,
    mail: config && appUrl && secret ? { config, appUrl, secret } : null,
    userData: {
      password: await bcrypt.hash(password, 12),
      temporaryPasswordExpiresAt: new Date(Date.now() + 48 * 60 * 60_000),
      passwordChangedAt: null,
    },
  }
}
