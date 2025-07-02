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
    // Make sure the OPENAI_API_KEY is available on the server side
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  
  // Enable server components external packages
  experimental: {
    serverComponentsExternalPackages: ['openai'],
  },
  
  // Enable source maps in production
  productionBrowserSourceMaps: true,
};

module.exports = nextConfig;
