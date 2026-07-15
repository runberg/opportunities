"use client"

import { useState, useRef, useEffect } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/shared/lib/utils"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const DAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

interface DatePickerProps {
  readonly value: string
  readonly onChange: (v: string) => void
  readonly min?: string
  readonly max?: string
  readonly disabled?: boolean
  readonly clearable?: boolean
  readonly placeholder?: string
  readonly triggerClassName?: string
  readonly className?: string
}

type Cell = { key: string; day: number | null }

function toISO(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

export function DatePicker({
  value,
  onChange,
  min,
  max,
  disabled,
  clearable = true,
  placeholder = "Select date",
  triggerClassName,
  className,
}: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const today = new Date()
  const parsed = value ? new Date(`${value}T00:00:00`) : null

  const [viewYear, setViewYear] = useState(() => (parsed ?? today).getFullYear())
  const [viewMonth, setViewMonth] = useState(() => (parsed ?? today).getMonth())

  useEffect(() => {
    if (value) {
      const d = new Date(`${value}T00:00:00`)
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
    }
  }, [value])

  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleMouseDown)
    return () => document.removeEventListener("mousedown", handleMouseDown)
  }, [open])

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear((y) => y - 1) }
    else setViewMonth((m) => m - 1)
  }

  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear((y) => y + 1) }
    else setViewMonth((m) => m + 1)
  }

  function selectDay(day: number) {
    const iso = toISO(viewYear, viewMonth, day)
    if (min && iso < min) return
    if (max && iso > max) return
    onChange(iso)
    setOpen(false)
  }

  function isOutOfRange(day: number) {
    const iso = toISO(viewYear, viewMonth, day)
    return (!!min && iso < min) || (!!max && iso > max)
  }

  function isSelected(day: number) {
    return !!parsed &&
      parsed.getFullYear() === viewYear &&
      parsed.getMonth() === viewMonth &&
      parsed.getDate() === day
  }

  function isToday(day: number) {
    return today.getFullYear() === viewYear &&
      today.getMonth() === viewMonth &&
      today.getDate() === day
  }

  function dayClass(day: number): string {
    if (isSelected(day)) return "bg-blue-600 text-white font-semibold"
    if (isOutOfRange(day)) return "text-gray-600 cursor-not-allowed"
    if (isToday(day)) return "text-blue-400 font-semibold hover:bg-gray-700"
    return "text-gray-200 hover:bg-gray-700"
  }

  // Build calendar grid: leading nulls for weekday offset, then day numbers
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay()
  const cells: Cell[] = new Array<null>(firstDayOfWeek).fill(null).map((_, i) => ({ key: `pad-s-${i}`, day: null }))
  for (let d = 1; d <= daysInMonth; d++) cells.push({ key: `day-${d}`, day: d })
  while (cells.length % 7 !== 0) cells.push({ key: `pad-e-${cells.length}`, day: null })

  const displayValue = parsed
    ? parsed.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
    : ""

  function spanClass(): string {
    if (triggerClassName) return displayValue ? "" : "opacity-60"
    return displayValue ? "text-gray-100" : "text-gray-500"
  }

  const defaultTriggerCls =
    "w-full flex items-center px-2.5 py-1.5 border border-gray-600 rounded-lg bg-gray-800 " +
    "text-left focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50 " +
    "hover:border-gray-500 transition-colors"

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => { if (!disabled) setOpen((o) => !o) }}
        className={triggerClassName ?? defaultTriggerCls}
      >
        <span className={cn("flex-1 text-xs", spanClass())}>
          {displayValue || placeholder}
        </span>
      </button>

      {open && !disabled && (
        <div className="absolute z-[100] mt-1 w-[17rem] bg-gray-800 border border-gray-700 rounded-xl shadow-xl p-3">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1 rounded-lg hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="text-sm font-medium text-gray-100 select-none">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1 rounded-lg hover:bg-gray-700 text-gray-300 transition-colors"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] font-medium text-gray-500 py-0.5">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map(({ key, day }) =>
              day === null ? (
                <div key={key} />
              ) : (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectDay(day)}
                  disabled={isOutOfRange(day)}
                  className={cn("h-8 w-full rounded-lg text-xs transition-colors", dayClass(day))}
                >
                  {day}
                </button>
              )
            )}
          </div>

          {parsed && clearable && (
            <div className="mt-2 pt-2 border-t border-gray-700">
              <button
                type="button"
                onClick={() => { onChange(""); setOpen(false) }}
                className="w-full text-xs text-gray-400 hover:text-gray-200 py-0.5 transition-colors"
              >
                Clear date
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
