import type { NextConfig } from "next";

// ponytail: cacheComponents is off — every page reads the session cookie and is
// dynamic anyway; turn it on when there are public pages worth caching.
const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Teacher material uploads (TXT/DOCX) up to 10 MB.
  experimental: {
    serverActions: { bodySizeLimit: "11mb" },
    // Client cache: a page seen in the last 30 s, or a menu page prefetched in the last minute,
    // opens without a server round trip. Every server action that changes data purges it.
    staleTimes: { dynamic: 30, static: 60 },
  },
  // Fonts and the mascot never change under the same name: let browsers keep them for a year.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    const security = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ];
    return [
      { source: "/:path*", headers: security },
      { source: "/fonts/:path*", headers: cache },
      { source: "/mascot/:path*", headers: cache },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
