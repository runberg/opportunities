import { getServerSession } from "next-auth"
import { authOptions } from "@/shared/lib/auth"
import { redirect } from "next/navigation"
import { Sidebar } from "@/shared/components/layout/sidebar"
import { GlobalSearch } from "@/shared/components/layout/global-search"

export default async function ProtectedLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const isAdmin = session.user.role === "ADMIN"
  const isOpportunitiesReadOnly = !isAdmin && session.user.opportunitiesAccess === "READ_ONLY"

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userName={session.user.name ?? session.user.email ?? ""}
        userRole={session.user.role}
        currentUserId={session.user.id}
        opportunitiesAccess={session.user.opportunitiesAccess}
        adhocAccess={session.user.adhocAccess}
        inventoryAccess={session.user.inventoryAccess}
      />
      <main className="flex-1 ml-60 overflow-y-auto">
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-3 flex justify-center">
          <GlobalSearch
            currentUserId={session.user.id}
            isAdmin={isAdmin}
            isOpportunitiesReadOnly={isOpportunitiesReadOnly}
          />
        </div>
        <div className="max-w-[1600px] mx-auto px-6 py-8">{children}</div>
      </main>
    </div>
  )
}
