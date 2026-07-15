import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/shared/components/layout/sidebar"

export default async function ProtectedLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userEmail={session.user.email ?? session.user.name ?? ""}
        userRole={session.user.role}
        currentUserId={session.user.id}
      />
      <main className="flex-1 ml-60 overflow-y-auto">
        <div className="px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
