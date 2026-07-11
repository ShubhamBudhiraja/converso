import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // API requests are proxied via app/api/v1/[...path]/route.ts so auth
  // cookies are set on the Vercel domain correctly.
};

export default nextConfig;
