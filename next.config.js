/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,
  
  // Optimize font loading
  optimizeFonts: false,
  
  // Enable webpack 5 for better performance
  webpack: (config, { isServer, dev }) => {
    // Important: return the modified config
    if (!isServer) {
      // Don't include Prisma client on the client-side
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
      };
    }

    // Disable font optimization in development
    if (dev) {
      config.optimization.minimize = false;
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
  
  // Disable TypeScript type checking during build (handled by CI)
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Disable ESLint during build (handled by CI)
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
