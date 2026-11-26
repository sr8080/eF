import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  experimental: {
    serverActions: {
      // Avatars (2 MB) and, later, match screenshots (5 MB) are uploaded through
      // Server Actions so they can be validated on the server. Leave headroom for
      // multipart overhead.
      bodySizeLimit: "6mb",
    },
  },
};

export default nextConfig;
