import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // These routes read prompts/*.md at runtime; ship the files with their functions.
  outputFileTracingIncludes: {
    "/onboarding": ["./prompts/profile-extract.md"],
    // The routes that call extractJob (it reads the prompt from disk).
    "/api/cron/process": ["./prompts/job-extract.md"],
    "/api/cron/llm-check": ["./prompts/job-extract.md"],
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
