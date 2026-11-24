"use client"

import { Suspense, useState } from "react"
import { getSession, signIn } from "next-auth/react"
import { safeSignInDestination } from "@/shared/lib/sign-in-destination"
import { useRouter, useSearchParams } from "next/navigation"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const callbackUrl = searchParams.get("callbackUrl")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      const result = await signIn("credentials", { email, password, redirect: false })
      if (!result?.ok || result.error) {
        setError("Invalid email or password.")
        return
      }

      const received = callbackUrl && URL.canParse(callbackUrl, window.location.origin)
        ? new URL(callbackUrl, window.location.origin)
        : null
      const destination = received?.origin === window.location.origin
        ? safeSignInDestination(received.pathname + received.search + received.hash)
        : "/dashboard"
      const session = await getSession()
      router.push(session?.user.mustChangePassword ? `/choose-password?next=${encodeURIComponent(destination)}` : destination)
      router.refresh()
    } catch {
      setError("Could not reach the portal. Check your connection and try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          className="w-full px-3 py-2 bg-[#0a1220] border border-[#1a2d40] rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
          placeholder="you@company.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 bg-[#0a1220] border border-[#1a2d40] rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
        />
      </div>

      {error && (
        <div className="text-sm text-red-400 bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#006fff] hover:bg-blue-600 text-white py-2 px-4 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-sm text-gray-400">Forgot your password? Contact your portal administrator.</p>
    </form>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#0a1220] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="bg-[#111b28] rounded-xl border border-[#1a2d40] p-8">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-blue-400">
              Opportunities<sup className="text-[10px] font-bold text-white ml-0.5 tracking-normal">AI</sup>
            </h1>
            <p className="text-sm text-gray-400 mt-1">Sign in to your account</p>
          </div>
          <Suspense fallback={null}>
            <LoginForm />
          </Suspense>
        </div>
      </div>
    </div>
  )
}
