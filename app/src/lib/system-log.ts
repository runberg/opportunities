import { db } from "./db"
import type { SystemLogType } from "@prisma/client"

export async function writeLog(opts: {
  type: SystemLogType
  message: string
  userId?: string | null
  opportunityId?: string | null
}) {
  try {
    await db.systemLog.create({ data: opts })
  } catch (err) {
    console.error("SystemLog write failed:", err)
  }
}
