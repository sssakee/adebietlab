import type { NextConfig } from "next";

// ponytail: cacheComponents is off — every page reads the session cookie and is
// dynamic anyway; turn it on when there are public pages worth caching.
const nextConfig: NextConfig = {
  // Teacher material uploads (TXT/DOCX) up to 10 MB.
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
  // Fonts and the mascot never change under the same name: let browsers keep them for a year.
  async headers() {
    const cache = [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }];
    return [
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
