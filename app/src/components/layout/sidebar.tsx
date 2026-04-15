"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { signOut } from "next-auth/react"
import {
  LayoutDashboard,
  FileText,
  ScrollText,
  Factory,
  Users,
  LogOut,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"

interface SidebarProps {
  userName: string
  userRole: string
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = userRole === "ADMIN"

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const linkCls = (href: string) =>
    cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
      isActive(href)
        ? "bg-gray-700 text-white"
        : "text-gray-400 hover:bg-gray-800 hover:text-white"
    )

  return (
    <aside className="w-60 bg-gray-900 text-white flex flex-col h-full fixed top-0 left-0 bottom-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-800">
        <span className="text-lg font-semibold tracking-tight">Opportunities</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <Link href="/dashboard" className={linkCls("/dashboard")}>
          <LayoutDashboard size={18} />
          Dashboard
        </Link>

        {/* Opportunities section */}
        <div className="pt-4 pb-1 px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
            Opportunities
          </span>
        </div>
        <Link href="/opportunities" className={linkCls("/opportunities")}>
          <FileText size={18} />
          Quotes
        </Link>
        <Link href="/els" className={linkCls("/els")}>
          <ScrollText size={18} />
          ELs
        </Link>
        <Link href="/production" className={linkCls("/production")}>
          <Factory size={18} />
          Production
        </Link>

        {/* Admin section */}
        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                Admin
              </span>
            </div>
            <Link href="/admin/users" className={linkCls("/admin/users")}>
              <Users size={18} />
              Users
            </Link>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-gray-800 space-y-1">
        <Link href="/profile" className={linkCls("/profile")}>
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
