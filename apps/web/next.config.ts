import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Necesario para transpilar @repmax/shared que exporta TypeScript puro (sin compilar)
  transpilePackages: ["@repmax/shared"],
};

export default nextConfig;
