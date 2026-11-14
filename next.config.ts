import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Temporary (2026-11-14): lets the image optimizer fetch the Higgsfield renders so they can be saved into public/bg.
  images: { remotePatterns: [{ protocol: "https", hostname: "d8j0ntlcm91z4.cloudfront.net" }] },
  partialPrefetching: true,
  // These routes read prompts/*.md at runtime; ship the files with their functions.
  outputFileTracingIncludes: {
    "/onboarding": ["./prompts/profile-extract.md"],
    // The confirmation mail (sent from the landing page's form) carries the prompt.
    "/": ["./prompts/profile-extract.md"],
    // The routes that call extractJob (it reads the prompt from disk).
    // process also prepares the morning picks (digest-pick.md), as do digest and picks.
    "/api/cron/process": ["./prompts/job-extract.md", "./prompts/digest-pick.md"],
    "/api/cron/llm-check": ["./prompts/job-extract.md"],
    "/api/cron/digest": ["./prompts/digest-pick.md"],
    "/api/cron/picks": ["./prompts/digest-pick.md"],
    "/api/cron/picks-personas": ["./prompts/digest-pick.md"],
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
