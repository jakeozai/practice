import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // /onboarding reads prompts/profile-extract.md at runtime; ship it with the function.
  outputFileTracingIncludes: {
    "/onboarding": ["./prompts/profile-extract.md"],
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
