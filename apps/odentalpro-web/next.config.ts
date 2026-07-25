import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@odentalpro/dental-schema",
    "@geemastudio/tenant-config",
  ],
};

export default nextConfig;
