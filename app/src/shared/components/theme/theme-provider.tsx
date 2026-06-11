"use client"

import { createContext, useContext, useEffect, useState, useMemo } from "react"

export type Theme = "light" | "dark"

interface ThemeContextValue {
  theme: Theme
  setTheme: (t: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
})

export function ThemeProvider({ children }: { readonly children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    const saved = localStorage.getItem("ui-theme") as Theme | null
    if (saved === "light" || saved === "dark") setTheme(saved)
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "dark" ? "dark" : ""
    localStorage.setItem("ui-theme", theme)
  }, [theme])

  const contextValue = useMemo(() => ({ theme, setTheme }), [theme, setTheme])

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}
