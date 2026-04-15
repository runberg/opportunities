export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/opportunities/:path*",
    "/admin/:path*",
    "/profile/:path*",
  ],
}
