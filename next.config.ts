import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  serverExternalPackages: ["z-ai-web-dev-sdk"],
  // Increase memory for AI SDK operations
  experimental: {
    workerThreads: false,
  },
};

export default nextConfig;