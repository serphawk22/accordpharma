import type { NextConfig } from "next";

const rawBackendUrl = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.BACKEND_URL ||
  "https://accordpharma-production.up.railway.app"
).trim().replace(/\/+$/, "");

const backendUrl = rawBackendUrl.replace(/\/api\/v1$/, "").replace(/\/api$/, "");

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  env: {
    NEXT_PUBLIC_API_URL: backendUrl,
    NEXT_PUBLIC_BACKEND_URL: backendUrl,
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: `${backendUrl}/api/v1/:path*`,
      },
      {
        source: "/backend-health",
        destination: `${backendUrl}/health`,
      },
      {
        source: "/backend-api/:path*",
        destination: `${backendUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
