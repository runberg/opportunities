import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/components/layout/sidebar"

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userName={session.user.name ?? "User"}
        userRole={session.user.role}
      />
      <main className="flex-1 ml-60 overflow-y-auto">
        <div className="max-w-7xl mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
