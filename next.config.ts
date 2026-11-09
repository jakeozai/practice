import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // These routes read prompts/*.md at runtime; ship the files with their functions.
  outputFileTracingIncludes: {
    "/onboarding": ["./prompts/profile-extract.md"],
    "/api/cron/collect": ["./prompts/job-extract.md"],
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
