import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  output: "standalone",               // ✅ top-level, not inside generateBuildId
  serverExternalPackages: ["pdf-parse", "pdf2json"],
  trailingSlash: false,

  generateBuildId: async () => {
    if (process.env.NODE_ENV === "production") {
      return "production-build"
    }
    return `build-${Date.now()}`
  },

  async headers() {
    return [
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate",
          },
        ],
      },
    ]
  },
}

export default nextConfig
