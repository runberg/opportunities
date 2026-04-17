import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme/theme-provider"

export const metadata: Metadata = {
  title: "Opportunities",
  description: "Sales opportunity tracker",
}

// Applied before CSS to prevent flash of unstyled content
const themeScript = `
  try {
    const t = localStorage.getItem('ui-theme');
    if (t === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
  } catch(e) {}
`

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
