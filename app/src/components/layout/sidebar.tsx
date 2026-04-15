"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  Briefcase,
  Users,
  LogOut,
  User,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: <LayoutDashboard size={18} />,
  },
  {
    href: "/opportunities",
    label: "Opportunities",
    icon: <Briefcase size={18} />,
  },
]

const adminItems = [
  {
    href: "/admin/users",
    label: "Users",
    icon: <Users size={18} />,
  },
]

interface SidebarProps {
  userName: string
  userRole: string
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = userRole === "ADMIN"

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname.startsWith(href)
  }

  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col h-full fixed top-0 left-0 bottom-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <span className="text-lg font-semibold tracking-tight">Opportunities</span>
      </div>

      {/* New Opportunity — always visible */}
      <div className="px-3 pt-4 pb-2">
        <Link
          href="/opportunities/new"
          className="flex items-center justify-center gap-2 w-full px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Opportunity
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
              isActive(item.href)
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            )}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Admin
              </span>
            </div>
            {adminItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                  isActive(item.href)
                    ? "bg-gray-700 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                )}
              >
                {item.icon}
                {item.label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
            isActive("/profile")
              ? "bg-gray-700 text-white"
              : "text-gray-400 hover:bg-gray-800 hover:text-white"
          )}
        >
          <User size={18} />
          <div className="min-w-0">
            <div className="text-sm truncate text-white">{userName}</div>
            <div className="text-xs text-gray-500 capitalize">{userRole.toLowerCase()}</div>
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
