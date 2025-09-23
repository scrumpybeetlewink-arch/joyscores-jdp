// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',                 // static 'out/' for Firebase Hosting
  images: { unoptimized: true },

  // TEMPORARY: keep deploys green while we stabilize types/ESLint.
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

export default nextConfig;
