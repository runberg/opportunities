import type { NextAuthOptions, Session } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { db } from "./db"
import bcrypt from "bcryptjs"
import { checkRateLimit, recordFailure, clearAttempts } from "./rate-limit"
import { writeLog } from "./system-log"

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
          throw new Error(`Too many failed attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`)
        }

        const user = await db.user.findUnique({
          where: { email: credentials.email },
          select: { id: true, name: true, email: true, password: true, credentialVersion: true, temporaryPasswordExpiresAt: true, role: true, active: true, opportunitiesAccess: true, adhocAccess: true, inventoryAccess: true, clientsAccess: true },
        })

        if (!user?.active) {
          recordFailure(key)
          return null
        }

        const valid = await bcrypt.compare(credentials.password, user.password)
        if (!valid || (user.temporaryPasswordExpiresAt && user.temporaryPasswordExpiresAt <= new Date()) ||
          (credentials.password === "change_me" && user.email !== process.env.ADMIN_EMAIL)) {
          recordFailure(key)
          return null
        }

        const signedIn = await db.user.updateMany({
          where: { id: user.id, active: true, credentialVersion: user.credentialVersion, password: user.password },
          data: { lastLoginAt: new Date() },
        })
        if (!signedIn.count) return null

        clearAttempts(key)
        return {
          id: user.id,
          credentialVersion: user.credentialVersion,
          mustChangePassword: !!user.temporaryPasswordExpiresAt,
          name: user.name,
          email: user.email,
          role: user.role,
          opportunitiesAccess: user.opportunitiesAccess,
          adhocAccess: user.adhocAccess,
          inventoryAccess: user.inventoryAccess,
          clientsAccess: user.clientsAccess,
        }
      },
    }),
  ],
  events: {
    async signIn({ user }) {
      await writeLog({ type: "LOGIN", message: "Logged in", userId: user.id })
    },
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        const u = user as unknown as { credentialVersion: number; mustChangePassword: boolean; role: string; opportunitiesAccess: string; adhocAccess: string; inventoryAccess: string; clientsAccess: string }
        token.credentialVersion = u.credentialVersion
        token.mustChangePassword = u.mustChangePassword
        token.role = u.role
        token.opportunitiesAccess = u.opportunitiesAccess
        token.adhocAccess = u.adhocAccess
        token.inventoryAccess = u.inventoryAccess
        token.clientsAccess = u.clientsAccess
      } else if (token.id) {
        const dbUser = await db.user.findUnique({
          where: { id: token.id as string },
          select: { name: true, role: true, opportunitiesAccess: true, adhocAccess: true, inventoryAccess: true, clientsAccess: true, active: true, credentialVersion: true, temporaryPasswordExpiresAt: true },
        })
        if (!dbUser?.active || dbUser.credentialVersion !== token.credentialVersion ||
          (dbUser.temporaryPasswordExpiresAt && dbUser.temporaryPasswordExpiresAt <= new Date())) {
          return { id: "", credentialVersion: -1, mustChangePassword: false, role: "", opportunitiesAccess: "", adhocAccess: "", inventoryAccess: "", clientsAccess: "NONE" }
        }

        token.mustChangePassword = !!dbUser.temporaryPasswordExpiresAt
        token.name = dbUser.name
        token.role = dbUser.role
        token.opportunitiesAccess = dbUser.opportunitiesAccess
        token.adhocAccess = dbUser.adhocAccess
        token.inventoryAccess = dbUser.inventoryAccess
        token.clientsAccess = dbUser.clientsAccess
      }
      return token
    },
    async session({ session, token }) {
      // NextAuth v4 resolves an empty session response to null on the server and client.
      if (!token.id) return {} as Session

      if (session.user) {
        session.user.id = token.id as string
        session.user.mustChangePassword = token.mustChangePassword
        session.user.credentialVersion = token.credentialVersion
        session.user.role = token.role as string
        session.user.opportunitiesAccess = token.opportunitiesAccess as string
        session.user.adhocAccess = token.adhocAccess as string
        session.user.inventoryAccess = token.inventoryAccess as string
        session.user.clientsAccess = token.clientsAccess ?? "NONE"
      }
      return session
    },
  },
  pages: {
    signIn: "/login",
  },
}
