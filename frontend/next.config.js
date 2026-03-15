/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Hide Next.js dev indicator bubble/logo in development.
  devIndicators: false,
  // Standalone output is for Docker self-hosting only.
  // Vercel manages its own output format — skip this when deploying to Vercel.
  ...(process.env.VERCEL ? {} : { output: "standalone" }),
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
  },
  // Allow Leaflet and heatmap plugins to load client-side only
  webpack: (config) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    return config;
  },
};

module.exports = nextConfig;
