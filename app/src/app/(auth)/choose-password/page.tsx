import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"
import { authOptions } from "@/shared/lib/auth"
import { ChoosePasswordForm } from "@/shared/components/profile/choose-password-form"
import { safeSignInDestination } from "@/shared/lib/sign-in-destination"

export default async function ChoosePasswordPage({
  searchParams,
}: {
  readonly searchParams: Promise<{ next?: string }>
}) {
  const session = await getServerSession(authOptions)
  if (!session?.user.email) redirect("/login")
  const destination = safeSignInDestination((await searchParams).next)
  if (!session.user.mustChangePassword) redirect(destination)

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <section className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-semibold text-gray-900">Choose your password</h1>
        <p className="mt-2 mb-6 text-sm text-gray-600">Set a new password for {session.user.email} to continue to Opportunities.</p>
        <ChoosePasswordForm email={session.user.email} destination={destination} />
      </section>
    </main>
  )
}
