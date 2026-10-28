import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    agentUpgrade: "security",
  },
  async rewrites() {
    if (process.env.VERCEL && !process.env.API_URL) return [];
    return [{ source: "/api/:path*", destination: `${process.env.API_URL ?? "http://localhost:4000"}/api/:path*` }];
  },
};

export default nextConfig;
