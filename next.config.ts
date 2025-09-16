// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // We’ll export static pages to /out for Firebase Hosting
  output: "export",
  reactStrictMode: true
};

export default nextConfig;
