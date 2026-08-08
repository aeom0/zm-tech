import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@odentalpro/dental-schema",
    "@zmtech/tenant-config",
  ],
};

export default nextConfig;
