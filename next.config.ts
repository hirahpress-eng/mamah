import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["z-ai-web-dev-sdk"],
  // Increase memory for AI SDK operations
  experimental: {
    workerThreads: false,
  },
};

export default nextConfig;