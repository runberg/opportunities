import { db } from "./db"
import type { Prisma, SystemLogType } from "@prisma/client"

export async function writeLog(opts: {
  type: SystemLogType
  message: string
  userId?: string | null
  opportunityId?: string | null
  adhocDeliverableId?: string | null
  inventoryPackageId?: string | null
}, tx?: Prisma.TransactionClient) {
  if (tx) {
    await tx.systemLog.create({ data: opts })
    return
  }

  try {
    await db.systemLog.create({ data: opts })
  } catch (err) {
    console.error("SystemLog write failed:", err)
  }
}
