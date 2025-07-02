/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  // Enable webpack 5 for better performance
  webpack: (config, { isServer }) => {
    // Important: return the modified config
    if (!isServer) {
      // Don't include Prisma client on the client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }
    return config;
  },
  // Add any environment variables that need to be available on the client side
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  // Add images configuration if you're using Next.js Image Optimization
  images: {
    domains: ['localhost'], // Add your image domains here
  },
};

module.exports = nextConfig;
