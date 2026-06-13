import type { Metadata } from "next"
import "./globals.css"

export const metadata: Metadata = {
  title: "Opportunities",
  description: "Sales opportunity tracker",
}

export default function RootLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  )
}
