import { requirePortalPageSession } from "@/shared/lib/page-access"
import { Sidebar } from "@/shared/components/layout/sidebar"
import { GlobalSearch } from "@/shared/components/layout/global-search"
import { countFailedEmails } from "@/shared/lib/email-outbox"

export default async function ProtectedLayout({
  children,
}: {
  readonly children: React.ReactNode
}) {
  const session = await requirePortalPageSession()

  const isAdmin = session.user.role === "ADMIN"
  const isOpportunitiesReadOnly = !isAdmin && session.user.opportunitiesAccess === "READ_ONLY"
  const failedEmailCount = isAdmin ? await countFailedEmails() : 0

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        userName={session.user.name ?? session.user.email ?? ""}
        userRole={session.user.role}
        opportunitiesAccess={session.user.opportunitiesAccess}
        adhocAccess={session.user.adhocAccess}
        inventoryAccess={session.user.inventoryAccess}
        clientsAccess={session.user.clientsAccess}
        failedEmailCount={failedEmailCount}
      />
      <main className="min-w-0 flex-1 ml-60 overflow-y-auto [scrollbar-gutter:stable]">
        <div className="sticky top-0 z-30 bg-white border-b border-gray-200 px-6 py-3 flex justify-center">
          <GlobalSearch
            isAdmin={isAdmin}
            isOpportunitiesReadOnly={isOpportunitiesReadOnly}
          />
        </div>
        <div className="mx-auto w-full max-w-[1440px] px-4 py-8 sm:px-6">{children}</div>
      </main>
    </div>
  )
}
