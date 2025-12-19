import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // Increase body size limit for API routes (10MB for pin uploads)
  experimental: {
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.tebi.io',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: '*.tebi.io',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
