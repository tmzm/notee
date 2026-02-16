import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    baseApiUrl: process.env.BASE_API_URL,
    baseApiSuffix: process.env.BASE_API_SUFFIX
  }
}

export default nextConfig
