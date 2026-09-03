"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { createPortal } from "react-dom"
import { Search, Loader2, Briefcase, Package } from "lucide-react"
import { cn } from "@/shared/lib/utils"
import { StatusBadge } from "@/modules/opportunities/components/status-badge"
import { OpportunityModal } from "@/modules/opportunities/components/opportunity-modal"
import { DELIVERABLE_STATUS_BADGE, DELIVERABLE_STATUS_LABEL } from "@/modules/adhoc/constants"

// ─── Types ────────────────────────────────────────────────────────────────────

type OpportunityResult = {
  id: string
  title: string
  subtitle: string
  internalId: string | null
  status: string
  group: string
  basePath: string
}

type AdhocResult = {
  id: string
  title: string
  subtitle: string
  status: string
  href: string
}

type SearchResponse = {
  opportunities: OpportunityResult[]
  adhoc: AdhocResult[]
}

type FlatResult =
  | { kind: "opportunity"; data: OpportunityResult }
  | { kind: "adhoc"; data: AdhocResult }

// ─── Component ───────────────────────────────────────────────────────────────

export function GlobalSearch({
  currentUserId, isAdmin, isOpportunitiesReadOnly = false,
}: {
  readonly currentUserId: string
  readonly isAdmin: boolean
  readonly isOpportunitiesReadOnly?: boolean
}) {
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [openOpportunityId, setOpenOpportunityId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // Cmd/Ctrl+K to focus
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    document.addEventListener("keydown", handleKey)
    return () => document.removeEventListener("keydown", handleKey)
  }, [])

  // Debounced fetch
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
        if (res.ok) setResults(await res.json())
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const flatResults: FlatResult[] = results
    ? [
        ...results.opportunities.map((data): FlatResult => ({ kind: "opportunity", data })),
        ...results.adhoc.map((data): FlatResult => ({ kind: "adhoc", data })),
      ]
    : []

  useEffect(() => { setActiveIndex(0) }, [results])

  function closeDropdown() {
    setOpen(false)
    setQuery("")
    setResults(null)
    inputRef.current?.blur()
  }

  function go(result: FlatResult) {
    if (result.kind === "opportunity") {
      router.push(result.data.basePath)
      setOpenOpportunityId(result.data.id)
    } else {
      router.push(result.data.href)
    }
    closeDropdown()
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false)
      inputRef.current?.blur()
      return
    }
    if (flatResults.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % flatResults.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + flatResults.length) % flatResults.length)
    } else if (e.key === "Enter") {
      e.preventDefault()
      const target = flatResults[activeIndex]
      if (target) go(target)
    }
  }

  const showDropdown = open && query.trim().length >= 2
  const hasResults = flatResults.length > 0
  let flatCursor = -1

  return (
    <div ref={containerRef} className="relative w-full max-w-xl">
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search opportunities, ad hoc… (⌘K)"
          className="w-full pl-9 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 focus:border-gray-400"
        />
        {loading && (
          <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
        )}
      </div>

      {showDropdown && (
        <div className="absolute z-40 mt-1 w-full max-h-[70vh] overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
          {!hasResults && !loading && (
            <p className="px-4 py-3 text-sm text-gray-400">No results for &ldquo;{query.trim()}&rdquo;</p>
          )}

          {results && results.opportunities.length > 0 && (
            <div className="py-1.5">
              <p className="flex items-center gap-1.5 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Briefcase size={12} />
                Opportunities
              </p>
              {results.opportunities.map((o) => {
                flatCursor += 1
                const idx = flatCursor
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => go({ kind: "opportunity", data: o })}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      idx === activeIndex ? "bg-gray-50" : "hover:bg-gray-50"
                    )}
                  >
                    <Briefcase size={14} className="text-gray-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-900 font-medium truncate">{o.title}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {o.subtitle}
                        {o.internalId ? ` · ${o.internalId}` : ""}
                      </p>
                    </div>
                    <span className="text-[11px] text-gray-400 shrink-0">{o.group}</span>
                    <StatusBadge status={o.status} short />
                  </button>
                )
              })}
            </div>
          )}

          {results && results.adhoc.length > 0 && (
            <div className="py-1.5 border-t border-gray-100">
              <p className="flex items-center gap-1.5 px-3 pb-1 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <Package size={12} />
                Ad Hoc
              </p>
              {results.adhoc.map((a) => {
                flatCursor += 1
                const idx = flatCursor
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => go({ kind: "adhoc", data: a })}
                    onMouseEnter={() => setActiveIndex(idx)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
                      idx === activeIndex ? "bg-gray-50" : "hover:bg-gray-50"
                    )}
                  >
                    <Package size={14} className="text-gray-400 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-gray-900 font-medium truncate">{a.title}</p>
                      <p className="text-xs text-gray-500 truncate">{a.subtitle}</p>
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0",
                        DELIVERABLE_STATUS_BADGE[a.status] ?? "bg-gray-100 text-gray-600"
                      )}
                    >
                      {DELIVERABLE_STATUS_LABEL[a.status] ?? a.status}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}

      {mounted && createPortal(
        <OpportunityModal
          opportunityId={openOpportunityId}
          onClose={() => { setOpenOpportunityId(null); router.refresh() }}
          currentUserId={currentUserId}
          isAdmin={isAdmin}
          isReadOnly={isOpportunitiesReadOnly}
        />,
        document.body
      )}
    </div>
  )
}
