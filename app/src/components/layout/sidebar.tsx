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
  Sun,
  Monitor,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "@/components/theme/theme-provider"

interface SidebarProps {
  userName: string
  userRole: string
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname()
  const isAdmin = userRole === "ADMIN"
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const linkCls = (href: string) =>
    cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
      isActive(href)
        ? "bg-blue-600/20 text-blue-400"
        : isDark
        ? "text-gray-400 hover:bg-white/5 hover:text-blue-300"
        : "text-gray-400 hover:bg-gray-800 hover:text-white"
    )

  const sidebarBg = isDark ? "bg-[#0a1220]" : "bg-gray-900"
  const borderColor = isDark ? "border-[#1a2d40]" : "border-gray-800"

  return (
    <aside className={cn("w-60 text-white flex flex-col h-full fixed top-0 left-0 bottom-0", sidebarBg)}>
      {/* Logo */}
      <div className={cn("px-5 py-5 border-b", borderColor)}>
        <span className="text-lg font-semibold tracking-tight text-blue-400">
          Opportunities<sup className="text-[10px] font-bold text-white ml-0.5 tracking-normal">AI</sup>
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <Link href="/dashboard" className={linkCls("/dashboard")}>
          <LayoutDashboard size={18} />
          Dashboard
        </Link>

        {/* Opportunities section */}
        <div className="pt-4 pb-1 px-3">
          <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-[#3d5570]" : "text-gray-500")}>
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
              <span className={cn("text-xs font-semibold uppercase tracking-wider", isDark ? "text-[#3d5570]" : "text-gray-500")}>
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

      {/* Theme toggle */}
      <div className={cn("px-3 py-3 border-t", borderColor)}>
        <div className={cn("flex items-center gap-1 rounded-lg p-1", isDark ? "bg-[#111b28]" : "bg-gray-800")}>
          <button
            onClick={() => setTheme("light")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors",
              theme === "light"
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            <Sun size={12} />
            Light
          </button>
          <button
            onClick={() => setTheme("dark")}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded text-xs font-medium transition-colors",
              theme === "dark"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-gray-400 hover:text-gray-200"
            )}
          >
            <Monitor size={12} />
            Dark
          </button>
        </div>
      </div>

      {/* User section */}
      <div className={cn("px-3 py-4 border-t space-y-1", borderColor)}>
        <Link href="/profile" className={linkCls("/profile")}>
          <User size={18} />
          <div className="min-w-0">
            <div className="text-sm truncate text-white">{userName}</div>
            <div className={cn("text-xs capitalize", isDark ? "text-[#3d5570]" : "text-gray-500")}>{userRole.toLowerCase()}</div>
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 transition-colors",
            isDark ? "hover:bg-white/5 hover:text-blue-300" : "hover:bg-gray-800 hover:text-white"
          )}
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
