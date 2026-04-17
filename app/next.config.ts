import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  devIndicators: false,
  // Allow larger file uploads
  experimental: {
    serverActions: {
      bodySizeLimit: "50mb",
    },
  },
}

export default nextConfig
