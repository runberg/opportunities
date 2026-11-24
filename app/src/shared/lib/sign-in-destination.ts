export function safeSignInDestination(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//") || /[\\\s]/.test(value)) {
    return "/dashboard"
  }
  const url = new URL(value, "https://portal.invalid")
  if (url.origin !== "https://portal.invalid" || url.pathname.startsWith("//") || ["/login", "/choose-password"].includes(url.pathname)) {
    return "/dashboard"
  }
  return url.pathname + url.search + url.hash
}
