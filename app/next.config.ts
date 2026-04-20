import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  // Opt out of Next.js anonymous usage telemetry sent to Vercel
  env: { NEXT_TELEMETRY_DISABLED: "1" },
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
}

export default nextConfig
