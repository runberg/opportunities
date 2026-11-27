import type { Prisma } from "@prisma/client"
import { z } from "zod"
import { DeliveryError } from "./server"

export const unitTypeName = z.string().trim().min(1).max(120)
export const unitTypeOption = { id: true, name: true } as const

export function getOrCreateUnitType(tx: Prisma.TransactionClient, name: string) {
  const nameKey = name.toLowerCase()
  return tx.deliveryUnitType.upsert({ where: { nameKey }, update: {}, create: { name, nameKey }, select: unitTypeOption })
}

export async function resolveDeliveryUnitType(tx: Prisma.TransactionClient, id?: string, legacyName?: string) {
  if (id) {
    const type = await tx.deliveryUnitType.findUnique({ where: { id }, select: unitTypeOption })
    if (!type) throw new DeliveryError("That product is no longer available. Select another product.", 400)
    return type
  }
  if (!legacyName) return undefined
  const type = await tx.deliveryUnitType.findUnique({ where: { nameKey: legacyName.toLowerCase() }, select: unitTypeOption })
  if (!type) throw new DeliveryError("Select an existing product.", 400)
  return type
}
