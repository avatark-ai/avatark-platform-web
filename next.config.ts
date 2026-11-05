import type { NextConfig } from "next";
import { NOINDEX_HEADER, NOINDEX_HOSTS, SECURITY_HEADERS } from "./lib/release/securityHeaders.ts";

// AVK-PROD-03A (C6): security headers on every route; noindex on the interim host (I-1).
// HSTS stays Vercel's default (not set here, no preload).
const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: [...SECURITY_HEADERS] },
      ...NOINDEX_HOSTS.map((host) => ({
        source: "/:path*",
        has: [{ type: "host" as const, value: host }],
        headers: [{ ...NOINDEX_HEADER }],
      })),
    ];
  },
};

export default nextConfig;
