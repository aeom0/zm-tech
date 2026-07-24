import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@odentalpro/dental-schema"],
};

export default nextConfig;
