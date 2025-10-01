import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'pdf2json', 'pdfjs-dist'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Exclude pdfjs-dist from server-side bundling
      config.externals = config.externals || [];
      config.externals.push('pdfjs-dist');
    }
    return config;
  },
};

export default nextConfig;
