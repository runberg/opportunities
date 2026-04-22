import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "./db"
import bcrypt from "bcryptjs"
import { checkRateLimit, recordFailure, clearAttempts } from "./rate-limit"

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60, // 8 hours
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const key = credentials.email.toLowerCase()
        const { allowed, retryAfterSeconds } = checkRateLimit(key)
        if (!allowed) {
          const minutes = Math.ceil((retryAfterSeconds ?? 900) / 60)
          throw new Error(`Too many failed attempts. Try again in ${minutes} minute${minutes !== 1 ? "s" : ""}.`)
        }

        const user = await db.user.findUnique({ where: { email: credentials.email } })

        if (!user || !user.active) {
          recordFailure(key)
          return null
        }

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid) {
          recordFailure(key)
          return null
        }

        clearAttempts(key)
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as unknown as { role: string }).role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}
