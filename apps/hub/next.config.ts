import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Transpilar package TS puro (sin build step)
  transpilePackages: ['@zmtech/hub-schema'],
}

export default nextConfig
