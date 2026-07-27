import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@zmtech/quote-engine'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
}

export default nextConfig
