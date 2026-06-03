import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const db = new PrismaClient()

async function main() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD

  if (!email || !password) {
    console.error("✗ ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment")
    process.exit(1)
  }

  const hashed = await bcrypt.hash(password, 12)

  await db.user.upsert({
    where: { email },
    update: { password: hashed, role: "ADMIN" },
    create: { email, password: hashed, role: "ADMIN", name: "Administrator" },
  })

  console.log(`✓ Admin account synced: ${email}`)
}

main()
  .then(() => db.$disconnect())
  .catch(async (e) => {
    console.error(e)
    await db.$disconnect()
    process.exit(1)
  })
