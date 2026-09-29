/** Next.js server start-up hook: runs once when the server process boots (not during build). */
export async function register() {
  // The email worker needs Node APIs and Prisma, so it only runs in the Node.js server runtime.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startEmailWorker } = await import("@/shared/lib/email-worker")
    startEmailWorker()
  }
}
