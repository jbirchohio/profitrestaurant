/** @type {import('next').NextConfig} */
const nextConfig = {
  // Remove output: 'export' for Vercel deployment
  reactStrictMode: true,
  swcMinify: true,
  
  // Image optimization
  images: {
    domains: ['vercel.com'],
    unoptimized: true,
  },
  
  // Webpack configuration
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
        path: false,
        os: false,
      };
    }
    return config;
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
  },
  
  // Enable source maps in production
  productionBrowserSourceMaps: true,
};

module.exports = nextConfig;
