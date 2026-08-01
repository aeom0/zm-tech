import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Necesario para transpilar @repmax/repmax-schema que exporta TypeScript puro (sin compilar)
  transpilePackages: ["@repmax/repmax-schema"],
};

export default nextConfig;
