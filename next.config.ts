import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'pdf2json'],
  // Use stable build ID for production
  generateBuildId: async () => {
    if (process.env.NODE_ENV === 'production') {
      return 'production-build'
    }
    return `build-${Date.now()}`
  },
  // Configure output for better static asset serving
  output: 'standalone',
  // Ensure proper asset handling
  trailingSlash: false,
  // Configure headers for static assets
  async headers() {
    return [
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=0, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
