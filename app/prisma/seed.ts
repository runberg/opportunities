import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

async function main() {
  const adminExists = await db.user.findFirst({ where: { role: "ADMIN" } })

  if (!adminExists) {
    const hashed = await bcrypt.hash("admin123", 12)
    await db.user.create({
      data: {
        name: "Administrator",
        email: "admin@opportunities.local",
        password: hashed,
        role: "ADMIN",
      },
    })
    console.log("✓ Created default admin user")
    console.log("  Email:    admin@opportunities.local")
    console.log("  Password: admin123")
    console.log("  ⚠ Change this password immediately after first login!")
  } else {
    console.log("✓ Admin user already exists — skipping seed")
  }
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
