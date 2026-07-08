import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["z-ai-web-dev-sdk"],
  allowedDevOrigins: [
    '*.space-z.ai',
    'https://*.space-z.ai',
    'http://*.space-z.ai',
    'https://preview-chat-25294527-e9a0-464d-8fa1-fd96b55b5553.space-z.ai',
    'http://localhost:3000',
  ],
  // Increase memory for AI SDK operations
  experimental: {
    workerThreads: false,
  },
};

export default nextConfig;