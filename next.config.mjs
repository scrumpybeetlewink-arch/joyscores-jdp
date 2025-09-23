/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  productionBrowserSourceMaps: true, // ← maps real line/column in console

  // TEMP while stabilizing – turn both to false later
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
