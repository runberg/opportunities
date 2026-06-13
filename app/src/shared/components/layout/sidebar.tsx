"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import {
  LayoutDashboard,
  FileText,
  ScrollText,
  Factory,
  Package,
  Users,
  Trash2,
  ClipboardList,
  Mail,
  LogOut,
  User,
  Plus,
} from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { NewOpportunityModal } from "@/modules/opportunities/components/new-opportunity-modal"

interface SidebarProps {
  readonly userEmail: string
  readonly userRole: string
}

export function Sidebar({ userEmail, userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isAdmin = userRole === "ADMIN"
  const [newModalOpen, setNewModalOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === "/dashboard"
    return pathname === href || pathname.startsWith(href + "/")
  }

  const linkCls = (href: string) => cn(
    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
    isActive(href)
      ? "bg-blue-600/20 text-blue-400"
      : "text-gray-400 hover:bg-white/5 hover:text-blue-300"
  )

  return (
    <>
    <aside className="w-60 text-white flex flex-col h-full fixed top-0 left-0 bottom-0 bg-[#0a1220]">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1a2d40]">
        <span className="text-lg font-semibold tracking-tight text-blue-400">
          Opportunities<sup className="text-[10px] font-bold text-white ml-0.5 tracking-normal">AI</sup>
        </span>
      </div>

      {/* New Opportunity */}
      <div className="px-3 py-3 border-b border-[#1a2d40]">
        <button
          type="button"
          onClick={() => setNewModalOpen(true)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-[#006fff] hover:bg-blue-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus size={16} />
          New Opportunity
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <Link href="/dashboard" className={linkCls("/dashboard")}>
          <LayoutDashboard size={18} />
          Dashboard
        </Link>

        <div className="pt-4 pb-1 px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3d5570]">Opportunities</span>
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

        <div className="pt-4 pb-1 px-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#3d5570]">Ad Hoc</span>
        </div>
        <Link href="/adhoc" className={linkCls("/adhoc")}>
          <Package size={18} />
          Ad Hoc Deliveries
        </Link>

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#3d5570]">Admin</span>
            </div>
            <Link href="/admin/users" className={linkCls("/admin/users")}>
              <Users size={18} />
              Users
            </Link>
            <Link href="/admin/smtp" className={linkCls("/admin/smtp")}>
              <Mail size={18} />
              Email / SMTP
            </Link>
            <Link href="/admin/logs" className={linkCls("/admin/logs")}>
              <ClipboardList size={18} />
              System Log
            </Link>
            <Link href="/admin/opportunities" className={linkCls("/admin/opportunities")}>
              <Trash2 size={18} />
              Delete
            </Link>
          </>
        )}
      </nav>

      {/* User section */}
      <div className="px-3 py-4 border-t border-[#1a2d40] space-y-1">
        <Link href="/profile" className={linkCls("/profile")}>
          <User size={18} />
          <div className="min-w-0">
            <div className="text-xs truncate text-white">{userEmail}</div>
            <div className="text-xs capitalize text-[#3d5570]">{userRole.toLowerCase()}</div>
          </div>
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-white/5 hover:text-blue-300 transition-colors"
        >
          <LogOut size={18} />
          Sign out
        </button>
      </div>
    </aside>

    {mounted && newModalOpen && createPortal(
      <NewOpportunityModal
        onClose={() => setNewModalOpen(false)}
        onCreated={() => {
          setNewModalOpen(false)
          router.push("/opportunities")
          router.refresh()
        }}
      />,
      document.body
    )}
  </>
  )
}
