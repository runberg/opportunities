"use client"

import { useEffect, useRef, useState } from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/shared/lib/utils"

type OpportunityOption = {
  id: string
  title: string
  customer: string
  internalId: string | null
}

export function OpportunityPicker({
  value,
  label,
  onChange,
}: {
  readonly value: string | null
  readonly label: string | null
  readonly onChange: (opportunity: OpportunityOption | null) => void
}) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<OpportunityOption[]>([])
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/inventory/opportunities?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.items.map((o: OpportunityOption) => ({ id: o.id, title: o.title, customer: o.customer, internalId: o.internalId })))
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  if (value && label) {
    return (
      <div className="flex items-center justify-between px-3 py-2 border border-gray-600 rounded-lg bg-gray-800 text-sm">
        <span className="text-gray-100 truncate">{label}</span>
        <button type="button" onClick={() => onChange(null)} className="text-gray-400 hover:text-gray-200 shrink-0 ml-2">
          <X size={14} />
        </button>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
          onFocus={() => setOpen(true)}
          placeholder="Search opportunities by title, customer, ID…"
          className="w-full pl-8 pr-3 py-2 border border-gray-600 rounded-lg text-sm bg-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {open && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-y-auto bg-gray-800 border border-gray-600 rounded-lg shadow-xl">
          {results.length === 0 && (
            <p className="px-3 py-2 text-sm text-gray-500">No matches</p>
          )}
          {results.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => { onChange(o); setQuery(""); setOpen(false) }}
              className={cn("w-full flex flex-col items-start px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors")}
            >
              <span className="text-gray-100 truncate w-full">{o.title}</span>
              <span className="text-xs text-gray-400 truncate w-full">
                {o.customer}{o.internalId ? ` · ${o.internalId}` : ""}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
