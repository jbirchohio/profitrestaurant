/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  reactStrictMode: true,
  optimizeFonts: false,
  
  // Required for static export
  images: {
    unoptimized: true,
  },
  
  // Webpack configuration
  webpack: (config, { isServer, dev }) => {
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
    };
    return config;
  },
  
  // Environment variables
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || '',
  },
  
  // Enable React DevTools in production
  reactProductionProfiling: true,
  
  // Disable type checking during build
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Enable source maps in production
  productionBrowserSourceMaps: true,
};

module.exports = nextConfig;
