export { default } from "next-auth/middleware"

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/opportunities/:path*",
    "/els/:path*",
    "/production/:path*",
    "/admin/:path*",
    "/profile/:path*",
    "/adhoc/:path*",
  ],
}
