import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
      role: string
      mustChangePassword: boolean
      credentialVersion: number
      opportunitiesAccess: string
      adhocAccess: string
      inventoryAccess: string
      clientsAccess: string
    } & DefaultSession["user"]
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    credentialVersion: number
    mustChangePassword: boolean
    role: string
    opportunitiesAccess: string
    adhocAccess: string
    inventoryAccess: string
    clientsAccess: string
  }
}
