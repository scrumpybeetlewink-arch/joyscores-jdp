// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  reactStrictMode: true,
  trailingSlash: true,          // ⬅️ ensures out/controller/index.html, out/live/index.html
};

export default nextConfig;
