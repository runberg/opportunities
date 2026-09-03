import { db } from "@/shared/lib/db"

export function findAllPackages() {
  return db.inventoryPackage.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      createdBy: { select: { id: true, name: true } },
      opportunity: { select: { id: true, title: true, customer: true, internalId: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          utilizations: {
            orderBy: { date: "desc" },
            include: {
              createdBy: { select: { id: true, name: true } },
              opportunity: { select: { id: true, title: true, customer: true, internalId: true, status: true } },
            },
          },
        },
      },
    },
  })
}
