/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: true },
  images: { remotePatterns: [{ protocol: "https", hostname: "**" }] },
  webpack: (config) => {
    config.module.rules.push({ test: /\.py$/, type: "asset/source" });
    return config;
  },
};
export default nextConfig;
