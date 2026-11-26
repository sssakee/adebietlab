import type { NextConfig } from "next";

// ponytail: cacheComponents is off — every page reads the session cookie and is
// dynamic anyway; turn it on when there are public pages worth caching.
const nextConfig: NextConfig = {
  // Teacher material uploads (TXT/DOCX) up to 10 MB.
  experimental: { serverActions: { bodySizeLimit: "11mb" } },
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
