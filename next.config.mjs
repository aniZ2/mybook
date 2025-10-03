// next.config.mjs
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: 'standalone'   // lets Firebase run SSR server instead of static-only
};

export default nextConfig;
